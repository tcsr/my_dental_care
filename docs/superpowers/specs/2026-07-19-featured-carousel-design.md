# Featured Products + Price-Free Carousel — Design Spec

**Date:** 2026-07-19
**Status:** Approved for planning
**Scope:** Let admins flag products as "featured" (single source of truth in Supabase) and make the landing-page carousel show only those featured products, without prices.

## Guiding Principle

Additive and backward-compatible. One nullable-defaulted column, additive migration. The carousel changes its data source and hides price; every other surface (catalog, product detail, cart, orders) is untouched and still shows prices.

## Motivation

Client request: the landing carousel should highlight the three headline product families from the "Simple Implants" slides (one-piece implant, two-piece implant, bone plate + screws) and must NOT show prices there. The set of highlighted products must be controllable by the admin and stay in sync across all users — so it is driven from Supabase, not local device state.

## Current System (as-is)

- **Carousel** (`src/components/LandingPage.jsx`, `Carousel()` ~line 57): reads `db.b2bProducts` from **local Dexie/IndexedDB**, falls back to the hardcoded `FALLBACK_PRODUCTS` array (~line 13). Renders all products. Each card shows image, category, name, description, **price** (~line 198), and a "View Details" button linking to `/catalog?product=<name>`.
- **Admin product form** (`src/components/ProductManagement.jsx`): B2B form saves to BOTH Supabase (`supabasePayload`, ~line 241) and local Dexie (add/edit paths). Fields already include `implant_subtype` from prior work.
- **products table** (Supabase): `name, category, description, price, stock_qty, image_url, active, ...`. Public read where `active`; admin-only write via `is_admin`.

## Changes

### 1. Schema — `is_featured` flag

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
```

Nullable-safe default `false` → every existing product is non-featured, no behavior change until an admin flags one.

### 2. Carousel — Supabase source, featured-only, no price

- **Data source switches to Supabase** (single source of truth, in sync for all users). On mount, fetch:
  `supabase.from('products').select('*').eq('active', true).eq('is_featured', true).order('name')`.
- **Featured-only with safe fallback:**
  - If the query returns ≥1 product → render **only** those (the admin's chosen highlights).
  - If it returns 0 (none flagged yet) OR errors → render `FALLBACK_PRODUCTS` (current default set) so the landing is never blank during setup. *(Approved decision.)*
- **Field mapping** Supabase → card shape: `desc = description`, `image = image_url` (first URL if pipe/comma-joined). Keep `name`, `category`.
- **Image resolution must be robust:** if the image string starts with `http`/`https`/`data:`/`blob:`, use it as-is; otherwise prefix `import.meta.env.BASE_URL`. (The current carousel unconditionally prefixes BASE_URL, which would corrupt an absolute Supabase URL — fix this as part of the swap.)
- **Remove price:** delete the price `<span>` from the card footer (~line 198). Footer keeps the "View Details" pill. Adjust footer layout so the single remaining element sits correctly (e.g. right-aligned or full-width).

### 3. Admin form — "Featured on landing" toggle

- Add `is_featured` to `EMPTY_B2B` (default `false`).
- Load `p.is_featured` when editing an existing product.
- Render a checkbox/toggle labelled "Featured on landing" using the file's existing control pattern.
- Persist `is_featured` in `supabasePayload` (the authoritative write the carousel reads).
- Also write `is_featured` into the local Dexie add/edit records for consistency (not read by the carousel anymore, but keeps the local cache faithful).

## Data / Behavior Flow

```
Admin edits product → toggles "Featured on landing" → saves
  → is_featured written to Supabase products (+ Dexie copy)

Landing carousel mounts
  → query Supabase: active AND is_featured
  → results ≥1  → show ONLY those, no price
  → results = 0 → show FALLBACK_PRODUCTS (no price), so never blank
```

## Backward-Compatibility

- Column defaults `false`: no product is featured until explicitly flagged; existing data valid.
- Only the carousel is affected. Catalog, product detail, cart, orders keep their price display and their existing data sources.
- If Supabase is unreachable at landing load, the fallback array keeps the carousel working (same resilience as today).

## Out of Scope (YAGNI)

- Hiding prices anywhere other than the landing carousel.
- Admin drag-ordering of featured products (carousel orders by name).
- A separate "featured" section distinct from the carousel (carousel itself becomes the featured strip).
- Creating the actual product records (e.g. a "One-piece implant" product). That is an admin data task: create the product, then flag it plus the two-piece implant and the bone plate.

## User Data Steps (post-implementation, not code)

1. Apply the migration in Supabase Dashboard → SQL Editor.
2. Create a "One-piece implant" product if one doesn't exist.
3. In admin, flag exactly the three headline products as Featured.
