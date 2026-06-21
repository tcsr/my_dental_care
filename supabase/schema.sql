-- ─── PROFILES ───────────────────────────────────────────────────────────────
create table profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  role        text not null default 'doctor',  -- 'admin', 'doctor', 'clinic'
  name        text,
  clinic_name text,
  phone       text,
  address     text,
  gst_number  text,
  approved    boolean not null default true,
  created_at  timestamptz default now()
);

alter table profiles enable row level security;

create policy "user reads own profile"
  on profiles for select to authenticated
  using (auth.uid() = id);

create policy "user updates own profile"
  on profiles for update to authenticated
  using (auth.uid() = id);

-- Helper function to check if a user is an admin without triggering RLS recursion
create or replace function is_admin(user_id uuid)
returns boolean security definer as $$
begin
  return exists (
    select 1 from profiles where id = user_id and role = 'admin'
  );
end;
$$ language plpgsql;

-- Helper function to update profile details and approve doctor immediately
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

create policy "admin reads all profiles"
  on profiles for select to authenticated
  using (is_admin(auth.uid()));

create policy "admin updates all profiles"
  on profiles for update to authenticated
  using (is_admin(auth.uid()));

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

-- ─── EMAIL AUTO-CONFIRMATION TRIGGER ─────────────────────────────────────────
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
