# Implant Catalog Expansion — Design Spec

**Date:** 2026-07-18
**Status:** Approved for planning
**Scope:** Extend the product/catalog/cart/order flow to support the product families shown in the "Simple Implants" reference slides — one-piece implants, two-piece implants, prosthetic/surgical kits, and bone plates + fixation screws.

## Guiding Principle

**Every change is additive and backward-compatible.** Migrations use `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` / category-row inserts only. No drops, no renames, no type changes to existing columns. Any product created before this work — with none of the new fields populated — must behave exactly as it does today: same catalog card, same add-to-cart, same order placement, same product-level stock decrement.

## Current System (as-is)

- **Stack:** React + Vite + Capacitor (mobile), Supabase (Postgres + RLS + Edge Functions), Zustand store, Dexie/IndexedDB cart persistence.
- **Products:** `products` table — `name, category, description, price, stock_qty, unit, image_url, sizes (comma-text), active`, plus B2B fields (`material, finish, sterilization, warrantyPct, bendableAngle`, batch/serial). `active`-based public read; admin-only write.
- **Categories:** DB-driven via `product_categories` table (`store.fetchCategories`). Catalog renders them dynamically; two static `CATEGORY_META` maps only supply icon/color and fall back to a default when a category is missing.
- **Cart:** held in `App.jsx` React state, keyed `productId` or `productId_size`, value `{ product, qty, size }`. Persisted per-user in Dexie, guest cart merged on login.
- **Add to cart:** `ProductCatalog.jsx:285` `addToCart(product, size=null)` → cartKey `productId` or `productId_size`.
- **Order placement:** `ProductCatalog.jsx:320` inserts one `orders` row + N `order_items` (`product_id, qty, unit_price, size`), then calls `decrement_stock` rpc per product.
- **order_items:** `product_id, qty, unit_price, size (text)`.
- **Related products:** `ProductCatalog.jsx:637` = `products.filter(p => p.category === selectedProduct.category)`.

## Features

### Phase 1 — Taxonomy

**1a. Bone Plate + Fixation Screw categories**
- Insert rows into `product_categories` (data, not code). Catalog picks them up dynamically.
- Add icon/color entries to `CATEGORY_META` in `ProductCatalog.jsx:45` and `ProductManagement.jsx:33`. Missing entry already falls back to default, so this is cosmetic and safe.
- Note: distinct from existing `Bone Graft` category. `bendableAngle` field already exists on products and applies to plates.

**1b. Implant subtype**
- New nullable column `products.implant_subtype text` — allowed values `one_piece`, `two_piece`, or NULL.
- Catalog: a subtype filter chip that appears **only** when the Implants category is selected. NULL subtype = existing implants unaffected and always shown under "All".
- ProductManagement: subtype dropdown shown only when category resolves to Implants.

### Phase 2 — Size variants

**Problem:** `products.sizes` is a free-text comma string (`"3.5 x 10mm, 4.0 x 12mm"`). Implants ship in dozens of diameter×length combinations, each needing its own stock (and possibly price). A string cannot track per-size inventory.

**Schema**
```
create table product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid references products(id) on delete cascade not null,
  diameter    text,           -- e.g. "3.5"
  length      text,           -- e.g. "10mm"
  sku         text,
  stock_qty   int not null default 0,
  price_delta numeric(10,2) default 0,   -- added to parent price; nullable-safe default 0
  active      boolean not null default true,
  created_at  timestamptz default now()
);
alter table order_items add column if not exists variant_id uuid references product_variants(id);
```

**Backward-compat rule (core of this phase):**
- Product with **zero** variant rows → behaves exactly as today: free-text `sizes` dropdown (or no size), product-level `stock_qty`, `decrement_stock`.
- Product with **≥1** variant rows → catalog shows the variant selector (diameter × length), per-variant `stock_qty`, price = parent `price + variant.price_delta`; add-to-cart binds the chosen variant.

**Cart**
- Key extends to `productId_variantId` for variant products. Existing `productId` and `productId_size` keys remain valid untouched. Cart value gains optional `variant` alongside existing `size`.

**Order + stock**
- `order_items.variant_id` populated for variant lines; `size` text kept as a denormalized human-readable label snapshot (so historical orders and the existing order-item renderers keep working with no change).
- New rpc `decrement_variant_stock(p_variant_id, p_qty)`, atomic, same guard pattern as `decrement_stock`. Non-variant products keep using `decrement_stock` unchanged.

### Phase 3 — Kit / bundle

**Model:** a kit IS a normal product — own `price`, `image_url`, `stock_qty`, category `Kit`. This deliberately reuses the entire existing cart/order/stock path with no new code branch.

**Schema**
```
alter table products add column if not exists is_kit boolean not null default false;
create table kit_components (
  id                  uuid primary key default gen_random_uuid(),
  kit_id              uuid references products(id) on delete cascade not null,
  component_product_id uuid references products(id) not null,
  qty                 int not null default 1
);
```

**Behavior**
- `is_kit = false` default → every existing product untouched.
- Kit detail page shows a "What's inside" list from `kit_components`.
- **Stock = kit's own `stock_qty`.** No component-stock computation, no component decrement on order (decided: matches how packaged kits are physically stocked; avoids double-counting components sold standalone; avoids multi-row transactional decrement + rollback complexity).
- Optional future (out of scope): admin-only read-only "suggest stock from components" helper.

### Phase 4 — Compatibility links

**Schema**
```
create table product_relations (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid references products(id) on delete cascade not null,
  related_product_id uuid references products(id) on delete cascade not null,
  relation_type      text not null   -- 'compatible_abutment' | 'compatible_driver' | 'recommended_kit'
);
```

**Behavior**
- Product detail "related products": if explicit `product_relations` rows exist for the product, show those (grouped by `relation_type`); otherwise fall back to the current `category ===` filter. Fully backward compatible — products with no relations look identical to today.
- Use case: a two-piece implant links its compatible abutment, driver, and recommended prosthetic kit.

## Security / RLS

Every new table (`product_variants`, `kit_components`, `product_relations`) mirrors the existing `products` policy pair:
- Public/authenticated **select** limited to `active = true` rows (where an `active` column applies) or rows whose parent product is visible.
- **Insert/update/delete** restricted to admins via the existing `is_admin(auth.uid())` helper.

`order_items.variant_id` inherits the existing `order_items` RLS (doctor owns via parent order; admin all). No new public write surface. No PII in any new column.

## Data Flow Summary

```
Admin creates product
  ├─ optional: implant_subtype            (Phase 1b)
  ├─ optional: variants (diameter/length/stock/price_delta)  (Phase 2)
  ├─ optional: is_kit + kit_components     (Phase 3)
  └─ optional: product_relations           (Phase 4)

Doctor browses catalog
  ├─ category + (implant subtype filter when Implants)   (Phase 1)
  ├─ variant product → pick variant → price = base + delta (Phase 2)
  ├─ kit product → sees "what's inside"                    (Phase 3)
  └─ detail → related = explicit relations else category   (Phase 4)

Add to cart → cartKey productId | productId_size | productId_variantId
Place order → order_items(product_id, qty, unit_price, size, variant_id?)
Stock → decrement_variant_stock (variant lines) | decrement_stock (rest)
```

## Backward-Compatibility & Regression Gate

After **each** phase, re-prove the untouched happy path before testing new paths:

1. Browse catalog, all existing categories render.
2. Add a **plain non-variant, non-kit product** to cart.
3. Place an order (Razorpay + manual paths).
4. Confirm `order_items` written and product-level stock decremented via `decrement_stock`.
5. Existing orders still render in DoctorOrders / OrderManagement (they read `size` text, which we preserve).

Only once the above passes, test the phase's new path (variant selection, kit detail, subtype filter, relations).

## Phasing / Order of Work

1. **Phase 1** (taxonomy) — lowest risk, no cart/order changes.
2. **Phase 2** (variants) — highest ROI; touches catalog, cart, order, stock rpc.
3. **Phase 3** (kits) — reuses product path.
4. **Phase 4** (compatibility) — pure enhancement to related-products display.

Each phase is independently shippable and independently reversible (drop the added table/column with no effect on prior data).

## Out of Scope (YAGNI)

- Component-level kit stock math / decrement.
- Per-variant images.
- Migrating existing `sizes` comma strings into `product_variants` automatically (admins opt in per product; string path stays as fallback).
- Auto price rules beyond a flat `price_delta`.
