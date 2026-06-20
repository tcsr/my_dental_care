-- ─── PROFILES ───────────────────────────────────────────────────────────────
create table profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  role        text not null default 'doctor',  -- 'admin', 'doctor', 'clinic'
  name        text,
  clinic_name text,
  phone       text,
  address     text,
  gst_number  text,
  approved    boolean not null default false,
  created_at  timestamptz default now()
);

alter table profiles enable row level security;

create policy "user reads own profile"
  on profiles for select to authenticated
  using (auth.uid() = id);

create policy "user updates own profile"
  on profiles for update to authenticated
  using (auth.uid() = id);

create policy "admin reads all profiles"
  on profiles for select to authenticated
  using (exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "admin updates all profiles"
  on profiles for update to authenticated
  using (exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, role, name)
  values (new.id, 'doctor', new.raw_user_meta_data->>'name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ─── PRODUCTS ────────────────────────────────────────────────────────────────
create table products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text,
  description text,
  price       numeric(10,2) not null,
  stock_qty   int not null default 0,
  unit        text default 'piece',
  image_url   text,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

alter table products enable row level security;

create policy "anyone can view active products"
  on products for select
  using (active = true or active is null);

create policy "admin manages products"
  on products for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));


-- ─── ORDERS ──────────────────────────────────────────────────────────────────
create table orders (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid references profiles(id) not null,
  status      text not null default 'pending',  -- pending, confirmed, dispatched, delivered, cancelled
  total       numeric(10,2),
  notes       text,
  created_at  timestamptz default now()
);

alter table orders enable row level security;

create policy "doctor views own orders"
  on orders for select to authenticated
  using (doctor_id = auth.uid());

create policy "doctor creates orders"
  on orders for insert to authenticated
  with check (
    doctor_id = auth.uid() and
    exists (select 1 from profiles where id = auth.uid() and approved = true)
  );

create policy "admin manages all orders"
  on orders for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));


-- ─── ORDER ITEMS ─────────────────────────────────────────────────────────────
create table order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references orders(id) on delete cascade not null,
  product_id  uuid references products(id) not null,
  qty         int not null,
  unit_price  numeric(10,2) not null
);

alter table order_items enable row level security;

create policy "doctor views own order items"
  on order_items for select to authenticated
  using (exists (
    select 1 from orders where id = order_id and doctor_id = auth.uid()
  ));

create policy "doctor inserts order items"
  on order_items for insert to authenticated
  with check (exists (
    select 1 from orders where id = order_id and doctor_id = auth.uid()
  ));

create policy "admin manages all order items"
  on order_items for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));


-- ─── INVOICES ────────────────────────────────────────────────────────────────
create table invoices (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references orders(id) not null,
  invoice_no  text unique not null,
  pdf_url     text,
  issued_at   timestamptz default now()
);

alter table invoices enable row level security;

create policy "doctor views own invoices"
  on invoices for select to authenticated
  using (exists (
    select 1 from orders where id = order_id and doctor_id = auth.uid()
  ));

create policy "admin manages invoices"
  on invoices for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));


-- ─── PURCHASES ───────────────────────────────────────────────────────────────
create table purchases (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid references products(id),
  qty           int not null,
  cost          numeric(10,2) not null,
  supplier_name text,
  purchased_at  date not null default current_date,
  notes         text
);

alter table purchases enable row level security;

create policy "admin manages purchases"
  on purchases for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));
