-- ─── 1. UPGRADE PRODUCTS TABLE ───
alter table products 
  add column if not exists sku text,
  add column if not exists purchase_cost numeric(10,2),
  add column if not exists is_serialized boolean default false;

-- ─── 2. CREATE LOOKUP TABLES ───

-- Product Categories
create table if not exists product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  bg_color text,
  text_color text,
  icon text,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table product_categories enable row level security;

create policy "anyone can view active categories" 
  on product_categories for select 
  using (active = true);

create policy "admin manages categories" 
  on product_categories for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- States
create table if not exists states (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table states enable row level security;

create policy "anyone can view active states" 
  on states for select 
  using (active = true);

create policy "admin manages states" 
  on states for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- Warehouses
create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table warehouses enable row level security;

create policy "anyone can view active warehouses" 
  on warehouses for select 
  using (active = true);

create policy "admin manages warehouses" 
  on warehouses for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- GST Rates
create table if not exists gst_rates (
  id uuid primary key default gen_random_uuid(),
  rate int not null unique,
  is_default boolean not null default false,
  created_at timestamptz default now()
);

alter table gst_rates enable row level security;

create policy "anyone can view gst rates" 
  on gst_rates for select 
  using (true);

create policy "admin manages gst rates" 
  on gst_rates for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- ─── 3. CREATE INVENTORY BATCHES & SERIALS TABLES ───

-- Product Batches
create table if not exists product_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade not null,
  batch_no text not null,
  expiry_date timestamptz not null,
  stock_qty int not null default 0,
  warehouse_id uuid references warehouses(id) on delete set null,
  created_at timestamptz default now()
);

alter table product_batches enable row level security;

create policy "anyone can view product batches" 
  on product_batches for select 
  using (true);

create policy "admin manages product batches" 
  on product_batches for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- Product Serials
create table if not exists product_serials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade not null,
  batch_id uuid references product_batches(id) on delete cascade,
  serial_no text not null unique,
  status text not null default 'available', -- available, sold, damaged
  created_at timestamptz default now()
);

alter table product_serials enable row level security;

create policy "anyone can view product serials" 
  on product_serials for select 
  using (true);

create policy "admin manages product serials" 
  on product_serials for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- ─── 4. SEED INITIAL LOOKUP DATA ───
insert into product_categories (name, bg_color, text_color, icon) values
  ('Implants', 'rgba(99,102,241,0.12)', '#6366f1', '🦷'),
  ('Instruments', 'rgba(14,165,233,0.12)', '#0ea5e9', '🔧'),
  ('Materials', 'rgba(16,185,129,0.12)', '#10b981', '🧪'),
  ('PPE', 'rgba(245,158,11,0.12)', '#f59e0b', '🧤'),
  ('Equipment', 'rgba(168,85,247,0.12)', '#a855f7', '⚙️'),
  ('Consumables', 'rgba(236,72,153,0.12)', '#ec4899', '📦')
on conflict (name) do nothing;

insert into states (name) values
  ('Telangana'),
  ('Andhra Pradesh'),
  ('Tamil Nadu'),
  ('Karnataka'),
  ('Maharashtra'),
  ('Delhi')
on conflict (name) do nothing;

insert into warehouses (name, address) values
  ('Main Warehouse', 'Hitech City, Hyderabad'),
  ('Hyderabad Hub', 'Secunderabad'),
  ('Rep Kit', 'Sales Kit Transit')
on conflict (name) do nothing;

insert into gst_rates (rate, is_default) values
  (5, false),
  (12, true),
  (18, false),
  (28, false)
on conflict (rate) do nothing;

-- ─── 5. FIX PROFILES RLS RECURSION ───
create or replace function is_admin(user_id uuid)
returns boolean security definer as $$
begin
  return exists (
    select 1 from profiles where id = user_id and role = 'admin'
  );
end;
$$ language plpgsql;

drop policy if exists "admin reads all profiles" on profiles;
create policy "admin reads all profiles"
  on profiles for select to authenticated
  using (is_admin(auth.uid()));

drop policy if exists "admin updates all profiles" on profiles;
create policy "admin updates all profiles"
  on profiles for update to authenticated
  using (is_admin(auth.uid()));

-- ─── 6. AUTO-APPROVE NEW REGISTRATIONS ───
alter table profiles alter column approved set default true;
update profiles set approved = true where approved = false;

-- Create update_own_profile function to handle clinic registration details
create or replace function update_own_profile(
  p_id uuid,
  p_name text,
  p_clinic_name text,
  p_phone text,
  p_address text,
  p_gst_number text
)
returns void security definer as $$
begin
  update profiles
  set 
    name = p_name,
    clinic_name = p_clinic_name,
    phone = p_phone,
    address = p_address,
    gst_number = p_gst_number,
    approved = true
  where id = p_id;
end;
$$ language plpgsql;

-- ─── 7. EMAIL AUTO-CONFIRMATION ON APPROVAL ───
create or replace function confirm_user_email_on_approval()
returns trigger language plpgsql security definer as $$
begin
  if new.approved = true then
    update auth.users
    set 
      email_confirmed_at = coalesce(email_confirmed_at, now())
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_approved on public.profiles;
create trigger on_profile_approved
  after insert or update on public.profiles
  for each row
  execute procedure confirm_user_email_on_approval();

-- One-time sync to confirm email for all currently approved users
update auth.users u
set 
  email_confirmed_at = coalesce(u.email_confirmed_at, now())
from public.profiles p
where p.id = u.id and p.approved = true;
