# Phase 1: Taxonomy (Bone Plate/Fixation categories + Implant subtype) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Bone Plate" and "Fixation Screw" product categories, and a nullable one-piece/two-piece implant subtype, both fully additive and backward-compatible.

**Architecture:** One additive SQL migration (new nullable column + category-row inserts). Two React edits: catalog gains icon/color metadata for the new categories plus an implant-subtype filter chip that appears only when Implants is selected; the admin product form gains a subtype dropdown that appears only for implant categories. Products with no subtype and pre-existing categories render exactly as today.

**Tech Stack:** React 18, Vite, Supabase (Postgres + RLS), Zustand. No test runner — verification is `npm run lint` + `npm run build` + browser preview via the dev server.

## Global Constraints

- Additive only: `ADD COLUMN IF NOT EXISTS`, `INSERT` category rows. No drops/renames/type changes. (from spec "Guiding Principle")
- `implant_subtype` allowed values: `one_piece`, `two_piece`, or NULL. NULL = unchanged legacy behavior. (spec Phase 1b)
- New categories are distinct from existing `Bone Graft`. (spec Phase 1a)
- New tables/rows mirror existing `products` RLS: public read active, admin-only write. (spec Security/RLS)
- Regression gate before testing new paths: browse catalog → add a plain product → place order → `decrement_stock` fires. (spec Regression Gate)

---

## File Structure

- `supabase/migrations/20260718_phase1_taxonomy.sql` — **Create.** Additive migration: `implant_subtype` column + category inserts.
- `src/components/ProductCatalog.jsx` — **Modify.** Add `CAT` metadata entries + fallback `CATEGORIES` entries for the two new categories; add implant-subtype filter chip + filter predicate.
- `src/components/ProductManagement.jsx` — **Modify.** Add new categories to `B2B_CATEGORIES`; add `implant_subtype` to form state; render subtype dropdown for implant categories; persist on save.

---

### Task 1: Additive DB migration

**Files:**
- Create: `supabase/migrations/20260718_phase1_taxonomy.sql`

**Interfaces:**
- Produces: `products.implant_subtype text` (nullable); `product_categories` rows named `Bone Plate` and `Fixation Screw`.

- [ ] **Step 1: Write the migration file**

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Phase 1 taxonomy — implant subtype + bone plate/fixation categories
-- Additive & backward-compatible. Run in Supabase Dashboard → SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Implant subtype (one_piece | two_piece | NULL). NULL = legacy behavior.
ALTER TABLE products ADD COLUMN IF NOT EXISTS implant_subtype text
  CHECK (implant_subtype IN ('one_piece', 'two_piece'));

-- 2. New product categories (distinct from existing "Bone Graft").
--    bg_color / text_color / icon columns match the existing product_categories seed.
-- icon column stores an emoji (matches the existing seed convention).
INSERT INTO product_categories (name, bg_color, text_color, icon)
VALUES
  ('Bone Plate',     'rgba(100,116,139,0.12)', '#64748b', '🦴'),
  ('Fixation Screw', 'rgba(120,113,108,0.12)', '#78716c', '🔩')
ON CONFLICT (name) DO NOTHING;
```

- [ ] **Step 2: Verify the file matches the existing category schema**

Run: `grep -n "insert into product_categories" -A4 supabase/migration.sql`
Expected: confirms columns `(name, bg_color, text_color, icon)`, `name text not null unique`, and `on conflict (name) do nothing` — already verified to match Step 1's INSERT. No change needed unless the seed has diverged.

- [ ] **Step 3: Apply migration in Supabase SQL Editor**

Paste the file contents into Supabase Dashboard → SQL Editor → Run.
Expected: "Success. No rows returned" for the ALTER; INSERT reports 2 rows (or 0 on re-run).

- [ ] **Step 4: Verify in DB**

Run in SQL Editor:
```sql
SELECT column_name FROM information_schema.columns
  WHERE table_name='products' AND column_name='implant_subtype';
SELECT name FROM product_categories WHERE name IN ('Bone Plate','Fixation Screw');
```
Expected: one column row `implant_subtype`; two category rows.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260718_phase1_taxonomy.sql
git commit -m "feat(db): add implant_subtype column and bone plate/fixation categories"
```

---

### Task 2: Catalog — category metadata + implant subtype filter

**Files:**
- Modify: `src/components/ProductCatalog.jsx` (the `CAT` map ends at line ~46; `CATEGORIES` const at line ~13; category-chip render at line ~1075; product filter at line ~252)

**Interfaces:**
- Consumes: `products` list items now optionally have `implant_subtype`.
- Produces: a new `subtype` filter state; chips filter catalog when `category === 'Implants'`.

- [ ] **Step 1: Add metadata for the two new categories**

In the `CAT` object (the map that ends with the `'Bone Graft'` entry, ~line 45), add two entries before the closing `}`:

```javascript
  'Bone Plate': { bg: 'rgba(100,116,139,0.12)', color: '#64748b', icon: Grid3x3 },
  'Fixation Screw': { bg: 'rgba(120,113,108,0.12)', color: '#78716c', icon: Wrench },
```

(`Grid3x3` and `Wrench` are already imported — they are used by existing entries.)

- [ ] **Step 2: Add the two categories to the fallback `CATEGORIES` array**

In `const CATEGORIES = [ ... ]` (line ~13), append to the last line before `]`:

```javascript
  'Genweld', 'Instant Provisionals', 'General Instruments', 'Bone Graft', 'Bone Plate', 'Fixation Screw'
```

(This is the fallback used only when the DB `categories` list is empty; `categoriesList` still overrides from DB when present.)

- [ ] **Step 3: Add subtype filter state**

Immediately after `const [category, setCategory] = useState('All');` (line ~176), add:

```javascript
  const [subtype, setSubtype] = useState('all'); // 'all' | 'one_piece' | 'two_piece'
```

- [ ] **Step 4: Apply subtype to the product filter**

In the `useMemo` product filter (line ~252), find the `matchCat` computation and the returned boolean. Extend the filter so subtype narrows results only when Implants is selected. Replace the existing `matchCat` block's return condition — locate:

```javascript
    const matchCat = category.toLowerCase() === 'all' ||
                     p.category?.toLowerCase() === category.toLowerCase() ||
                     mappedCat?.toLowerCase() === category.toLowerCase();
```

and add directly below it, before the final return of the callback:

```javascript
    const matchSubtype =
      category.toLowerCase() !== 'implants' ||
      subtype === 'all' ||
      p.implant_subtype === subtype;
```

Then include `&& matchSubtype` in the existing return expression (the line that ANDs `matchCat` with the search match). Add `subtype` to the `useMemo` dependency array (currently `[products, search, category]` → `[products, search, category, subtype]`).

- [ ] **Step 5: Render the subtype chip row (only when Implants selected)**

Directly after the category-chip `</div>` block (the `cat-scroll` flex container that ends around line ~1110, right before the product grid / empty state), insert:

```javascript
              {category.toLowerCase() === 'implants' && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[
                    { k: 'all', label: 'All types' },
                    { k: 'one_piece', label: 'One-piece' },
                    { k: 'two_piece', label: 'Two-piece' },
                  ].map(({ k, label }) => (
                    <button
                      key={k}
                      onClick={() => setSubtype(k)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 12,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        fontFamily: 'Outfit',
                        cursor: 'pointer',
                        border: subtype === k ? '1.5px solid #6366f1' : '1.5px solid rgba(99,102,241,0.2)',
                        background: subtype === k ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.7)',
                        color: subtype === k ? '#6366f1' : 'hsl(var(--text-muted))',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
```

- [ ] **Step 6: Reset subtype when leaving Implants**

In the category chip `onClick` handler (the one calling `setCategory(cat)` around line ~1090), add a reset so a stale subtype filter can't hide products:

```javascript
                      onClick={() => { setCategory(cat); if (cat.toLowerCase() !== 'implants') setSubtype('all'); }}
```

(Match the existing handler's exact form; only add the `setSubtype('all')` guard.)

- [ ] **Step 7: Lint + build**

Run: `npm run lint`
Expected: no new errors in `ProductCatalog.jsx`.
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Browser-preview verification (regression + new path)**

Start the dev server (preview_start `{name:"dev"}` — create `.claude/launch.json` with `npm run dev` if absent), then in the preview:
- Regression: select "All", confirm every existing product still shows; open a plain product, add to cart, confirm cart count increments.
- New path: select "Implants" → the One-piece / Two-piece / All-types chips appear. With no product having a subtype yet, "All types" shows all implants and the specific subtypes show none (expected until Task 3 tags products). Switch away from Implants → chips disappear and full list returns.

Capture a screenshot of the Implants view with the subtype chips.

- [ ] **Step 9: Commit**

```bash
git add src/components/ProductCatalog.jsx
git commit -m "feat(catalog): bone plate/fixation category styling + implant subtype filter"
```

---

### Task 3: Admin product form — subtype field + new categories

**Files:**
- Modify: `src/components/ProductManagement.jsx` (`B2B_CATEGORIES` ~line 96; `EMPTY_B2B` ~line 103; form render + save handler)

**Interfaces:**
- Consumes: `products.implant_subtype` column from Task 1.
- Produces: admin can set `implant_subtype` and assign the new categories; write persists to Supabase.

- [ ] **Step 1: Add new categories to `B2B_CATEGORIES`**

Append to the last line of the array (line ~100), before `]`:

```javascript
  'Genweld', 'Instant Provisionals', 'General Instruments', 'Bone Graft', 'Bone Plate', 'Fixation Screw'
```

- [ ] **Step 2: Add `implant_subtype` to the empty B2B form state**

In `EMPTY_B2B` (line ~103), add the key (empty string = NULL on save):

```javascript
  bendableAngle: '0', sizes: '', implant_subtype: ''
```

- [ ] **Step 3: Load existing subtype when editing a product**

Find where the edit handler seeds the form from an existing product `p` (search for `sizes: p.sizes` or the object that spreads product fields into form state, near line ~201). Add:

```javascript
        implant_subtype: p.implant_subtype || '',
```

alongside the other `p.*` field assignments in that same object.

- [ ] **Step 4: Render the subtype dropdown (implant categories only)**

Locate the form field for `category` (search `form.category` / the category `<select>`). Immediately after that field's closing `</Field>` (or wrapper), add a conditional field:

```javascript
                {(form.category === 'Implant' || form.category === 'Implants' ||
                  ['Root Form','Compression','Basal','Basal SS','Compression MU','Basal MU'].includes(form.category)) && (
                  <Field label="Implant Subtype">
                    <select
                      value={form.implant_subtype}
                      onChange={(e) => setForm({ ...form, implant_subtype: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">— none —</option>
                      <option value="one_piece">One-piece</option>
                      <option value="two_piece">Two-piece</option>
                    </select>
                  </Field>
                )}
```

(Use the same `setForm({ ...form, ... })` update pattern the sibling fields use; if the component uses a different setter name, match it.)

- [ ] **Step 5: Persist subtype on save**

Find the Supabase insert/update payload built from `form` on save (search `.from('products')` `.insert(` / `.update(` in this file). Add to the payload object:

```javascript
        implant_subtype: form.implant_subtype || null,
```

(`|| null` converts the empty-string "none" back to NULL so the CHECK constraint passes.)

- [ ] **Step 6: Lint + build**

Run: `npm run lint`
Expected: no new errors in `ProductManagement.jsx`.
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Browser-preview verification**

In the preview, logged in as admin → Product Management (B2B):
- Create/edit an implant product, set Subtype = Two-piece, save. Confirm no error and the value round-trips on re-open.
- Set a plain non-implant product (e.g. an Instrument) — confirm the Subtype field is hidden and save still works (regression).
- Assign a product to category "Bone Plate", save, then in the catalog confirm it appears under the Bone Plate chip.
- Back in catalog Implants view: the product tagged Two-piece now appears under the "Two-piece" chip (closes the Task 2 Step 8 loop).

- [ ] **Step 8: Commit**

```bash
git add src/components/ProductManagement.jsx
git commit -m "feat(admin): implant subtype field + bone plate/fixation categories in product form"
```

---

## Self-Review Notes

- **Spec coverage:** Phase 1a (categories) → Task 1 Step 1 + Task 2 Steps 1-2 + Task 3 Step 1. Phase 1b (subtype) → Task 1 Step 1 + Task 2 Steps 3-6 + Task 3 Steps 2-5. Regression gate → Task 2 Step 8, Task 3 Step 7.
- **Backward-compat:** every DB change is `IF NOT EXISTS`/insert; `implant_subtype` nullable with `|| null` on save; subtype filter is a no-op unless category is Implants AND subtype ≠ 'all'; new form field hidden for non-implant categories.
- **Type consistency:** subtype values `one_piece`/`two_piece`/`''`(UI)→`null`(DB) used identically across catalog filter, form dropdown, and the DB CHECK constraint. Category names `Bone Plate` / `Fixation Screw` spelled identically in migration, `CAT` map, `CATEGORIES`, and `B2B_CATEGORIES`.
- **Assumption to verify during Task 1:** exact `product_categories` column names/uniqueness — Task 1 Step 2 checks this against `supabase/migration.sql` before applying.
