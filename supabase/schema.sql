-- NutriMD — schema PostgreSQL (Supabase)
-- Rulare: Supabase Dashboard → SQL Editor, sau `supabase db push`.
-- Datele personale sunt protejate prin Row Level Security (fiecare utilizator își vede doar datele lui).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- Profiluri
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  name text,
  lang text not null default 'ro' check (lang in ('ro', 'ru')),
  data jsonb not null default '{}'::jsonb,       -- vârstă, sex, înălțime, greutate, obiectiv, dietă, alergeni etc. (tipul Profile)
  consent_at timestamptz,                          -- consimțământ explicit pentru date de sănătate
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean language sql stable security definer as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------- Catalog
create table if not exists ingredients (
  id text primary key,
  name_ro text not null,
  name_ru text not null,
  emoji text,
  aisle text not null,
  category text not null,
  unit text not null check (unit in ('g', 'ml', 'pcs')),
  grams_per_unit numeric,
  per100 jsonb not null,                           -- {kcal, protein, carbs, fat, fiber, sugar, salt}
  allergens text[] not null default '{}',
  substitutes text[] not null default '{}',
  pantry boolean not null default false
);

create table if not exists recipes (
  id text primary key,
  title jsonb not null,                            -- {ro, ru}
  description jsonb not null default '{}'::jsonb,
  emoji text,
  image_url text,                                  -- Supabase Storage: bucket recipe-media
  video jsonb,                                     -- {url, chapters:[{stepIndex,startSec}], captionsUrl}
  cuisine text not null,
  meal_types text[] not null,
  servings int not null check (servings > 0),
  prep_min int not null default 0,
  cook_min int not null default 0,
  difficulty int not null check (difficulty between 1 and 3),
  equipment text[] not null default '{}',
  extra_tags text[] not null default '{}',
  meal_prep_friendly boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recipe_ingredients (
  recipe_id text references recipes on delete cascade,
  position int not null,
  ingredient_id text references ingredients,
  amount numeric not null,
  note jsonb,
  primary key (recipe_id, position)
);

create table if not exists recipe_steps (
  recipe_id text references recipes on delete cascade,
  position int not null,
  text jsonb not null,                             -- {ro, ru}
  timer_min int,
  image_url text,
  primary key (recipe_id, position)
);

-- ---------------------------------------------------------------- Magazine și prețuri
create table if not exists stores (
  id text primary key,
  name text not null,
  color text,
  online_url text,
  delivery_url text,
  cities text[] not null default '{}',
  source text not null default 'admin' check (source in ('api', 'feed', 'admin', 'demo')),
  feed_url text,                                   -- feed CSV/XML de la partener (import programat)
  active boolean not null default true
);

create table if not exists store_locations (
  id uuid primary key default gen_random_uuid(),
  store_id text references stores on delete cascade,
  city text not null,
  label text not null,
  lat double precision not null,
  lng double precision not null
);

create table if not exists store_products (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references stores on delete cascade,
  ean text not null,
  ingredient_id text references ingredients,
  name text,
  brand text,
  pack_size numeric,
  pack_label text,
  by_weight boolean not null default false,
  price numeric(10,2) not null check (price > 0),
  promo_price numeric(10,2),
  promo_until timestamptz,
  in_stock boolean not null default true,
  image_url text,
  updated_at timestamptz not null default now(),
  unique (store_id, ean)
);
create index if not exists store_products_ingredient on store_products (ingredient_id);

-- Istoric de prețuri (pentru grafice și detectarea promoțiilor false)
create table if not exists price_history (
  id bigserial primary key,
  product_id uuid references store_products on delete cascade,
  price numeric(10,2) not null,
  promo_price numeric(10,2),
  recorded_at timestamptz not null default now()
);
create or replace function log_price() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.price is distinct from old.price or new.promo_price is distinct from old.promo_price then
    insert into price_history (product_id, price, promo_price) values (new.id, new.price, new.promo_price);
  end if;
  return new;
end $$;
drop trigger if exists trg_log_price on store_products;
create trigger trg_log_price after insert or update on store_products for each row execute function log_price();

-- Asociere ingredient–produs preferat per magazin (setată de admin)
create table if not exists ingredient_product_map (
  store_id text references stores on delete cascade,
  ingredient_id text references ingredients on delete cascade,
  product_id uuid references store_products on delete cascade,
  primary key (store_id, ingredient_id)
);

create table if not exists import_log (
  id bigserial primary key,
  store_id text references stores,
  source text not null,
  rows int not null,
  errors int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Date utilizator
create table if not exists meal_plans (
  user_id uuid primary key references auth.users on delete cascade,
  plan jsonb not null,                             -- tipul MealPlan
  updated_at timestamptz not null default now()
);

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  slot text not null,
  name text not null,
  grams numeric,
  nutrition jsonb not null,
  source text not null,
  ref_id text,
  created_at timestamptz not null default now()
);
create index if not exists journal_user_date on journal_entries (user_id, date);

create table if not exists body_metrics (
  user_id uuid references auth.users on delete cascade,
  date date not null,
  weight_kg numeric,
  water_ml int,
  primary key (user_id, date)
);

create table if not exists spending (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  amount numeric(10,2) not null,
  store_ids text
);

create table if not exists favorites (
  user_id uuid references auth.users on delete cascade,
  recipe_id text references recipes on delete cascade,
  primary key (user_id, recipe_id)
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  recipe_id text not null references recipes on delete cascade,
  user_id uuid references auth.users on delete set null,
  author text not null,
  rating int not null check (rating between 1 and 5),
  text text not null check (char_length(text) <= 600),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS
alter table profiles enable row level security;
alter table meal_plans enable row level security;
alter table journal_entries enable row level security;
alter table body_metrics enable row level security;
alter table spending enable row level security;
alter table favorites enable row level security;
alter table reviews enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table recipe_steps enable row level security;
alter table ingredients enable row level security;
alter table stores enable row level security;
alter table store_locations enable row level security;
alter table store_products enable row level security;
alter table ingredient_product_map enable row level security;
alter table import_log enable row level security;
alter table price_history enable row level security;

-- Date proprii
create policy "own profile" on profiles for all using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());
create policy "own plan" on meal_plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own journal" on journal_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own metrics" on body_metrics for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own spending" on spending for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own favorites" on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Recenzii: oricine citește cele aprobate; autorul își vede/creează; adminul moderează
create policy "read approved reviews" on reviews for select using (status = 'approved' or user_id = auth.uid() or is_admin());
create policy "write own review" on reviews for insert with check (user_id = auth.uid() and status = 'pending');
create policy "moderate reviews" on reviews for update using (is_admin());
create policy "delete reviews" on reviews for delete using (is_admin());

-- Catalog: citire publică, scriere doar admin
do $$
declare t text;
begin
  foreach t in array array['recipes','recipe_ingredients','recipe_steps','ingredients','stores','store_locations','store_products','ingredient_product_map','price_history'] loop
    execute format('create policy "public read %1$s" on %1$s for select using (true)', t);
    execute format('create policy "admin write %1$s" on %1$s for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;
create policy "admin import log" on import_log for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------- Statistici admin
create or replace view admin_stats with (security_invoker = true) as
select
  (select count(*) from profiles) as users,
  (select count(*) from profiles where created_at > now() - interval '7 days') as new_users_7d,
  (select count(*) from recipes where published) as recipes,
  (select count(*) from store_products) as products,
  (select count(*) from reviews where status = 'pending') as pending_reviews,
  (select count(distinct user_id) from journal_entries where date > current_date - 7) as active_users_7d;

-- Storage: creează bucket-ul public „recipe-media” pentru poze și video (Dashboard → Storage).
