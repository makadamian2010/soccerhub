begin;
create table if not exists public.users(id uuid primary key references auth.users(id) on delete cascade,auth_id uuid unique not null references auth.users(id) on delete cascade,role text not null default 'customer' check(role in ('customer','admin')),first_name text not null default '',last_name text not null default '',email text not null,phone text not null default '',address jsonb not null default '{}',date_of_birth date,gender_preference text,marketing_consent boolean not null default false,created_at timestamptz not null default now());
alter table public.users enable row level security;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.users where auth_id=auth.uid() and role='admin') $$;
revoke all on function public.is_admin() from public;grant execute on function public.is_admin() to anon,authenticated,service_role;
create policy own_profile on public.users for select to authenticated using(auth_id=auth.uid() or public.is_admin());
create policy edit_own_profile on public.users for update to authenticated using(auth_id=auth.uid()) with check(auth_id=auth.uid());
revoke all on public.users from anon,authenticated;grant select on public.users to authenticated;grant update(first_name,last_name,phone,address,date_of_birth,gender_preference,marketing_consent) on public.users to authenticated;grant all on public.users to service_role;
create or replace function public.profile_birthdate(value text) returns date language plpgsql immutable set search_path=public as $$begin return nullif(value,'')::date;exception when others then return null;end $$;
create or replace function public.sync_customer_profile() returns trigger language plpgsql security definer set search_path=public as $$begin
 insert into users(id,auth_id,email,first_name,last_name,phone,address,marketing_consent,date_of_birth,gender_preference) values(new.id,new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'first_name',new.raw_user_meta_data->>'given_name',''),coalesce(new.raw_user_meta_data->>'last_name',new.raw_user_meta_data->>'family_name',''),coalesce(new.raw_user_meta_data->>'phone',''),case when jsonb_typeof(new.raw_user_meta_data->'address')='object' then new.raw_user_meta_data->'address' else '{}' end,coalesce((new.raw_user_meta_data->>'marketing_consent')='true',false),public.profile_birthdate(new.raw_user_meta_data->>'date_of_birth'),left(new.raw_user_meta_data->>'gender_preference',80)) on conflict(auth_id) do update set email=excluded.email;return new;end $$;
drop trigger if exists kashish_customer_profile on auth.users;
create trigger kashish_customer_profile after insert or update of email on auth.users for each row execute function public.sync_customer_profile();
insert into users(id,auth_id,email) select id,id,coalesce(email,'') from auth.users on conflict(auth_id) do nothing;
create table public.addresses(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,label text not null default 'Home',recipient text not null,phone text not null default '',country text not null,street text not null,apartment text not null default '',city text not null,state text not null,postal_code text not null,created_at timestamptz default now());
alter table public.addresses enable row level security;
create policy own_addresses on public.addresses for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.addresses to authenticated;revoke all on public.addresses from anon;grant all on public.addresses to service_role;
create table public.wishlists(user_id uuid not null references auth.users(id) on delete cascade,product_id bigint not null references public.products(id),created_at timestamptz default now(),primary key(user_id,product_id));
alter table public.wishlists enable row level security;
create policy own_wishlist on public.wishlists for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,delete on public.wishlists to authenticated;revoke all on public.wishlists from anon;grant all on public.wishlists to service_role;
create sequence public.product_ids start 200000000000000;
create sequence public.variant_ids start 300000000000000;
alter table public.products alter column id set default nextval('public.product_ids');
alter table public.variants alter column id set default nextval('public.variant_ids');
alter table public.products add column if not exists brand text not null default '';
alter table public.products add column if not exists category text not null default '';
alter table public.products add column if not exists subcategory text not null default '';
alter table public.products add column if not exists sku text not null default '';
alter table public.products add column if not exists fabric text not null default '';
alter table public.products add column if not exists care_instructions text not null default '';
alter table public.products add column if not exists video_url text;
alter table public.products add column if not exists video_urls jsonb not null default '[]';
alter table public.products add column if not exists discount numeric not null default 0;
alter table public.products add column if not exists featured boolean not null default false;
alter table public.products add column if not exists new_arrival boolean not null default false;
alter table public.products add column if not exists visible boolean not null default true;
alter table public.products add column if not exists stock_quantity integer not null default 0;
alter table public.products add column if not exists deleted_at timestamptz;
alter table public.products add column if not exists created_at timestamptz not null default now();
alter table public.variants add column if not exists compare_at_price integer;
alter table public.variants add column if not exists color text not null default '';
alter table public.variants add column if not exists sku text not null default '';
update public.products set featured=('featured-products'=any(collections));
create or replace function public.sync_product_stock() returns trigger language plpgsql security definer set search_path=public as $$begin update products set stock_quantity=coalesce((select sum(greatest(stock-reserved_stock,0)) from variants where product_id=coalesce(new.product_id,old.product_id) and active),0) where id=coalesce(new.product_id,old.product_id);return coalesce(new,old);end $$;
create trigger product_stock_total after insert or update or delete on public.variants for each row execute function public.sync_product_stock();
update public.products p set stock_quantity=coalesce((select sum(greatest(stock-reserved_stock,0)) from public.variants v where v.product_id=p.id and active),0);
drop policy products_read on public.products;
create policy products_read on public.products for select using((visible and deleted_at is null) or public.is_admin());
drop policy variants_read on public.variants;
create policy variants_read on public.variants for select using(exists(select 1 from products where products.id=product_id and visible and deleted_at is null) or public.is_admin());
alter table public.orders add column if not exists shipping_status text not null default 'processing';
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists discount_total integer not null default 0;
create policy admin_orders on public.orders for select to authenticated using(public.is_admin());
create policy admin_order_items on public.order_items for select to authenticated using(public.is_admin());
create table public.discounts(id uuid primary key default gen_random_uuid(),name text not null,code text not null unique,percent integer not null check(percent between 1 and 90),collection text,active boolean not null default true,stripe_coupon_id text not null,expires_at timestamptz,created_at timestamptz not null default now());
create table public.site_content(key text primary key,value jsonb not null,updated_at timestamptz not null default now());
create table public.audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id),action text not null,target text,created_at timestamptz not null default now());
alter table public.discounts enable row level security;alter table public.site_content enable row level security;alter table public.audit_logs enable row level security;
create policy public_site_content on public.site_content for select using(key in ('hero','homepage','store'));
create policy admin_discounts on public.discounts for select to authenticated using(public.is_admin());
create policy admin_audit on public.audit_logs for select to authenticated using(public.is_admin());
revoke all on public.discounts,public.site_content,public.audit_logs from anon,authenticated;
grant select on public.site_content to anon,authenticated;grant select on public.discounts,public.audit_logs to authenticated;grant all on public.discounts,public.site_content,public.audit_logs to service_role;
grant usage,select on sequence public.product_ids,public.variant_ids to service_role;
create or replace function public.bootstrap_owner(p_auth_id uuid) returns void language plpgsql security definer set search_path=public as $$begin perform pg_advisory_xact_lock(77160917);if exists(select 1 from users where role='admin') then raise exception 'Owner already configured';end if;if not exists(select 1 from auth.users where id=p_auth_id and email_confirmed_at is not null) then raise exception 'Verify your email before owner setup';end if;update users set role='admin' where auth_id=p_auth_id;if not found then raise exception 'Profile not found';end if;end $$;
revoke all on function public.bootstrap_owner(uuid) from public,anon,authenticated;grant execute on function public.bootstrap_owner(uuid) to service_role;
create or replace function public.admin_save_product(p_id bigint,p_data jsonb) returns bigint language plpgsql security definer set search_path=public as $$
declare product_key bigint;v jsonb;variant_key bigint;held integer;seen bigint[]:='{}';begin
 if p_id is null then insert into products(title,handle) values(p_data->>'title',p_data->>'handle') returning id into product_key;else product_key:=p_id;perform 1 from products where id=p_id for update;if not found then raise exception 'Product not found';end if;end if;
 update products set title=p_data->>'title',handle=p_data->>'handle',description=p_data->>'description',brand=p_data->>'brand',category=p_data->>'category',subcategory=p_data->>'subcategory',sku=p_data->>'sku',fabric=p_data->>'fabric',care_instructions=p_data->>'care_instructions',video_urls=p_data->'video_urls',video_url=p_data->'video_urls'->>0,images=p_data->'images',collections=array(select jsonb_array_elements_text(p_data->'collections')),featured=(p_data->>'featured')::boolean,new_arrival=(p_data->>'new_arrival')::boolean,visible=(p_data->>'visible')::boolean,discount=coalesce((p_data->>'discount')::numeric,0) where id=product_key;
 for v in select value from jsonb_array_elements(p_data->'variants') loop
  variant_key:=nullif(v->>'id','')::bigint;
  if variant_key is not null then select reserved_stock into held from variants where id=variant_key and product_id=product_key for update;if not found then raise exception 'Variant not found';end if;if (v->>'stock')::integer<held then raise exception 'Stock cannot be lower than reserved quantity';end if;
   update variants set title=v->>'title',price=(v->>'price')::integer,compare_at_price=nullif(v->>'compare_at_price','')::integer,stock=(v->>'stock')::integer,active=(v->>'active')::boolean,color=v->>'color',sku=v->>'sku' where id=variant_key;
  else insert into variants(product_id,title,price,compare_at_price,stock,active,color,sku) values(product_key,v->>'title',(v->>'price')::integer,nullif(v->>'compare_at_price','')::integer,(v->>'stock')::integer,(v->>'active')::boolean,v->>'color',v->>'sku') returning id into variant_key;end if;
  seen:=array_append(seen,variant_key);
 end loop;
 if exists(select 1 from variants where product_id=product_key and not(id=any(seen)) and reserved_stock>0) then raise exception 'A reserved variant cannot be removed';end if;
 update variants set active=false where product_id=product_key and not(id=any(seen));return product_key;
end $$;
revoke all on function public.admin_save_product(bigint,jsonb) from public,anon,authenticated;grant execute on function public.admin_save_product(bigint,jsonb) to service_role;
create or replace function public.admin_adjust_inventory(p_variant bigint,p_delta integer,p_active boolean default null) returns void language plpgsql security definer set search_path=public as $$begin perform 1 from variants where id=p_variant for update;if not found then raise exception 'Variant not found';end if;if exists(select 1 from variants where id=p_variant and stock+p_delta<reserved_stock) then raise exception 'Cannot reduce stock below existing reservations';end if;update variants set stock=stock+p_delta,active=coalesce(p_active,active) where id=p_variant;end $$;
revoke all on function public.admin_adjust_inventory(bigint,integer,boolean) from public,anon,authenticated;grant execute on function public.admin_adjust_inventory(bigint,integer,boolean) to service_role;
-- Storage is installed on hosted Supabase; use a separate migration for local SQL tests.
commit;
create or replace function public.admin_metrics() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object(
 'revenue',coalesce((select sum(total_price) from orders where payment_status='paid'),0),
 'orders',(select count(*) from orders),
 'orders_today',(select count(*) from orders where created_at>date_trunc('day',now())),
 'products_sold',coalesce((select sum(i.quantity) from order_items i join orders o on o.id=i.order_id where o.payment_status='paid'),0),
 'customers',(select count(*) from users where role='customer'),
 'low_stock',(select count(*) from variants where active and stock-reserved_stock<=3),
 'daily',(select jsonb_agg(row_to_json(d)) from (select to_char(day,'YYYY-MM-DD') as date,coalesce(sum(o.total_price) filter(where o.payment_status='paid'),0) as revenue,count(o.id) as orders from generate_series(current_date-29,current_date,interval '1 day') day left join orders o on o.created_at>=day and o.created_at<day+interval '1 day' group by day order by day)d),
 'best_sellers',(select coalesce(jsonb_agg(row_to_json(b)),'[]'::jsonb) from (select i.title,sum(i.quantity) as quantity,sum(i.quantity*i.price) as revenue from order_items i join orders o on o.id=i.order_id where o.payment_status='paid' group by i.title order by quantity desc limit 6)b));
$$;
revoke all on function public.admin_metrics() from public,anon,authenticated;grant execute on function public.admin_metrics() to service_role;
