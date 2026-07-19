# Featured Products + Price-Free Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Supabase-sourced `is_featured` flag; make the landing carousel show only featured products (fallback to defaults when none) with no prices; give admins a toggle to set it.

**Architecture:** One additive migration (`products.is_featured`). The carousel switches its data source from local Dexie to Supabase, filters to featured, drops the price, and resolves image URLs robustly. The admin B2B form gains a "Featured on landing" toggle that persists to Supabase (and the local Dexie copy).

**Tech Stack:** React 18, Vite, Supabase (Postgres + RLS), Zustand, Dexie. No test runner — verification is `npm run lint` + `npm run build` + browser preview via the dev server.

## Global Constraints

- Additive only: `ADD COLUMN IF NOT EXISTS`, default `false`. No drops/renames/type changes.
- Carousel data source = Supabase `products` where `active = true AND is_featured = true` (single source of truth, in sync for all users).
- Featured-only WITH safe fallback: ≥1 featured → show only those; 0 or error → show `FALLBACK_PRODUCTS`. Never blank.
- Price is hidden ONLY in the landing carousel. Catalog, product detail, cart, orders keep prices.
- Image resolution: use the string as-is if it starts with `http`/`https`/`data:`/`blob:`; otherwise prefix `import.meta.env.BASE_URL`.
- Featured toggle must be settable on BOTH add and edit of a B2B product.

---

## File Structure

- `supabase/migrations/20260719_add_is_featured.sql` — **Create.** Additive migration.
- `src/components/LandingPage.jsx` — **Modify.** `Carousel()`: Supabase fetch + featured filter + fallback (~line 75-89), robust image (~line 117), remove price (~line 192-199).
- `src/components/ProductManagement.jsx` — **Modify.** `EMPTY_B2B` (~line 105), edit-seed (~line 208), toggle UI (after Category field ~line 729), `supabasePayload` (~line 243-255), Dexie add object (~line 261-287), Dexie update object (~line 299-315).

---

### Task 1: Additive migration — `is_featured`

**Files:**
- Create: `supabase/migrations/20260719_add_is_featured.sql`

**Interfaces:**
- Produces: `products.is_featured boolean not null default false`.

- [ ] **Step 1: Write the migration file**

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Add is_featured flag to products (landing carousel highlights)
-- Additive & backward-compatible. Run in Supabase Dashboard → SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260719_add_is_featured.sql
git commit -m "feat(db): add is_featured flag to products"
```

Note: applying this in the Supabase Dashboard and flagging products is a USER step (no live DB access here). Do not attempt to run it.

---

### Task 2: Carousel — Supabase source, featured-only, no price

**Files:**
- Modify: `src/components/LandingPage.jsx`

**Interfaces:**
- Consumes: `products.is_featured`, `products.image_url`, `products.description` from Supabase.

- [ ] **Step 1: Import supabase**

At the top of the file, next to `import { db } from '../utils/db';` (~line 11), add:

```javascript
import { supabase } from '../utils/supabase';
```

(Verify the path: other components import it as `'../utils/supabase'`. Match whatever they use.)

- [ ] **Step 2: Add a robust image resolver helper**

Above the `Carousel()` function, add a module-level helper:

```javascript
const resolveCarouselImage = (img) => {
  if (!img) return '';
  const first = String(img).split('|')[0].split(',')[0].trim();
  if (/^(https?:|data:|blob:)/.test(first)) return first;
  const base = import.meta.env.BASE_URL || '/';
  return base + (first.startsWith('/') ? first.slice(1) : first);
};
```

- [ ] **Step 3: Replace the Dexie fetch with a Supabase featured fetch**

Replace the entire `useEffect` that calls `db.b2bProducts.toArray()` (currently ~line 75-89) with:

```javascript
  useEffect(() => {
    async function fetchFeatured() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .eq('is_featured', true)
          .order('name');
        if (!error && data && data.length > 0) {
          const mapped = data.map(p => ({
            ...p,
            desc: p.description || '',
            image: p.image_url || '',
          }));
          setProducts(mapped);
        }
        // else: keep FALLBACK_PRODUCTS (no featured rows, or error) — never blank
      } catch (e) {
        console.error('Carousel featured fetch failed:', e);
      }
    }
    fetchFeatured();
  }, []);
```

(`products` state still initializes to `FALLBACK_PRODUCTS` at ~line 59, which is the fallback.)

- [ ] **Step 4: Use the robust image resolver in the card**

Find the line building the image source (~line 117):

```javascript
              const imgSrc = `${import.meta.env.BASE_URL || '/'}${prod.image?.startsWith('/') ? prod.image.slice(1) : prod.image}`;
```

Replace it with:

```javascript
              const imgSrc = resolveCarouselImage(prod.image);
```

- [ ] **Step 5: Remove the price from the card footer**

In the card footer (~line 192-212), delete the price `<span>` block:

```javascript
                <span style={{
                  fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.1rem',
                  color: isHov ? '#0ea5e9' : '#0f172a',
                  transition: 'color 0.3s ease',
                }}>
                  ₹{prod.price.toLocaleString('en-IN')}
                </span>
```

Then change the footer container so the remaining "View Details" pill aligns correctly — change its `justifyContent` from `'space-between'` to `'flex-end'` (the footer `<div>` at ~line 192). Leave the "View Details" `<span>` untouched.

- [ ] **Step 6: Lint + build**

Run: `npm run lint`
Expected: no NEW errors in `LandingPage.jsx` (there is a pre-existing baseline; compare, don't require zero).
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Browser-preview verification (controller/user)**

Start dev server, open the landing page:
- With no product flagged featured yet → carousel shows the fallback default set, and NO card shows a ₹ price.
- Cards still navigate to `/catalog?product=...` on click; arrows/dots still work.
- (After the user flags products in Supabase, re-check: only those appear.)

- [ ] **Step 8: Commit**

```bash
git add src/components/LandingPage.jsx
git commit -m "feat(landing): carousel sources featured products from Supabase, drops price"
```

---

### Task 3: Admin form — "Featured on landing" toggle

**Files:**
- Modify: `src/components/ProductManagement.jsx`

**Interfaces:**
- Consumes: `products.is_featured` (Task 1).
- Produces: admin can set `is_featured`; persisted to Supabase + Dexie.

- [ ] **Step 1: Add `is_featured` to `EMPTY_B2B`**

In `EMPTY_B2B` (~line 105), add the key at the end before `}`:

```javascript
  ..., implant_subtype: '', is_featured: false };
```

(Append `is_featured: false` to the existing object; keep all current keys.)

- [ ] **Step 2: Load `is_featured` when editing**

Find the edit-seed object that sets `isSerialized: !!p.isSerialized` (~line 208). Add alongside it:

```javascript
        is_featured: !!p.is_featured,
```

- [ ] **Step 3: Persist in `supabasePayload`**

In `supabasePayload` (~line 243-255), add after the `implant_subtype` line:

```javascript
        implant_subtype: form.implant_subtype || null,
        is_featured: !!form.is_featured
```

(Add a comma after the `implant_subtype` value and append the `is_featured` line; keep it valid JS.)

- [ ] **Step 4: Persist in the Dexie add object**

In the `newProduct` object (~line 261-287), add after the `implant_subtype` line:

```javascript
          implant_subtype: form.implant_subtype || null,
          is_featured: !!form.is_featured,
```

- [ ] **Step 5: Persist in the Dexie update object**

In the `db.b2bProducts.update(modal.id, { ... })` object (~line 299-315), add after the `implant_subtype` line:

```javascript
          implant_subtype: form.implant_subtype || null,
          is_featured: !!form.is_featured
```

(Match the trailing-comma style of that object literal.)

- [ ] **Step 6: Render the toggle (both add and edit)**

Immediately BEFORE the `<Field label="Category">` block (~line 729) — so it renders for both add and edit — insert:

```javascript
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    id="modal_featured"
                    checked={!!form.is_featured}
                    onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="modal_featured" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'hsl(var(--text-primary))', cursor: 'pointer' }}>
                    Featured on landing carousel
                  </label>
                </div>
```

(This mirrors the existing serialized-checkbox pattern at ~line 716. Confirm it sits inside the same form container as the Category field and that `form`/`setForm` are in scope there — they are, per the sibling fields.)

- [ ] **Step 7: Lint + build**

Run: `npm run lint`
Expected: no NEW errors in `ProductManagement.jsx` (pre-existing baseline exists — compare).
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Browser-preview verification (controller/user)**

Admin → Product Management (B2B):
- Edit an existing product → the "Featured on landing carousel" checkbox appears, toggles, and its state round-trips on re-open.
- Add a new product with it checked → saves without error.
- Non-featured products save unchanged (regression).

- [ ] **Step 9: Commit**

```bash
git add src/components/ProductManagement.jsx
git commit -m "feat(admin): add Featured-on-landing toggle persisted to Supabase and Dexie"
```

---

## Self-Review Notes

- **Spec coverage:** schema → Task 1. Carousel Supabase source + featured-only + fallback + robust image + no price → Task 2 (Steps 3, 3, 3, 2/4, 5). Admin toggle + persistence → Task 3 (all steps).
- **Backward-compat:** column defaults false; carousel keeps `FALLBACK_PRODUCTS` init + falls back on empty/error; price removed only in carousel; toggle defaults false and is additive to every save path.
- **Type consistency:** `is_featured` is a boolean everywhere — DB column, `supabasePayload` (`!!form.is_featured`), both Dexie writes, form state (`EMPTY_B2B` false, edit-seed `!!p.is_featured`), toggle (`e.target.checked`). Carousel queries `.eq('is_featured', true)`. Field maps `description→desc`, `image_url→image` consistently with the card's use of `prod.desc` / `prod.image`.
- **Data source note:** carousel now reads Supabase, but Dexie still stores `is_featured` for local-cache fidelity (Task 3 Steps 4-5) — harmless, keeps the rep-catalog record complete.
