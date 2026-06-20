-- Enable PostGIS extension for geolocation tracking
create extension if not exists postgis;

-- Custom types for your transport logic
create type user_role as enum ('passenger', 'driver', 'admin');
create type ride_status as enum ('requested', 'accepted', 'ongoing', 'completed', 'cancelled');
create type vehicle_category as enum ('Standard', 'Shared', 'Premium');

-- Drivers Profile Table extending Supabase Auth profiles
create table public.drivers_metadata (
    id uuid references auth.users on delete cascade primary key,
    full_name text not null,
    phone_number text unique not null,
    license_plate text unique not null,
    vehicle_type vehicle_category default 'Standard'::vehicle_category,
    is_verified boolean default false,
    wallet_balance numeric(10,2) default 0.00,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Core Rides Tracking Table
create table public.rides (
    id uuid default gen_random_uuid() primary key,
    passenger_id uuid not null, -- References passenger user ID
    driver_id uuid references auth.users(id), -- Nullable until accepted
    status ride_status default 'requested'::ride_status,
    pickup_location geography(Point, 4326) not null,
    dropoff_location geography(Point, 4326) not null,
    pickup_address text not null,
    dropoff_address text not null,
    fare_ghs numeric(10,2) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Essential spatial index for ultra-fast localized radius lookups
create index idx_rides_pickup on public.rides using gist (pickup_location);

-- ---------------------------------------------------------------------------
-- Real-time Driver Location Tracking
-- ---------------------------------------------------------------------------

-- One row per driver; upserted by the driver's mobile app on every GPS ping
create table public.driver_locations (
    driver_id        uuid references auth.users on delete cascade primary key,
    current_location geography(Point, 4326) not null,
    updated_at       timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Spatial index — powers ST_DWithin proximity lookups in get_nearby_drivers
create index idx_driver_locations_current
    on public.driver_locations
    using gist (current_location);

-- RLS: drivers can only read/write their own location row
alter table public.driver_locations enable row level security;

create policy "driver_locations_self_select" on public.driver_locations
    for select to authenticated
    using ( (select auth.uid()) = driver_id );

create policy "driver_locations_self_upsert" on public.driver_locations
    for insert to authenticated
    with check ( (select auth.uid()) = driver_id );

create policy "driver_locations_self_update" on public.driver_locations
    for update to authenticated
    using  ( (select auth.uid()) = driver_id )
    with check ( (select auth.uid()) = driver_id );

-- ---------------------------------------------------------------------------
-- Mobile Money (MoMo) Payment Infrastructure
-- ---------------------------------------------------------------------------

-- Store the provider's transaction hash on the ride row after payment clears
alter table public.rides
    add column if not exists payment_reference text default null;

-- Atomic payment settlement function.
-- Called by the /api/v1/payments/momo-callback webhook on a 'success' event.
-- All three mutations (ride → completed, payment_reference, wallet credit)
-- execute inside a single implicit plpgsql transaction — all or nothing.
create or replace function process_momo_payment(
    p_ride_id               uuid,
    p_driver_id             uuid,
    p_transaction_reference text,
    p_amount_ghs            numeric
)
returns jsonb
language plpgsql as $$
declare
    v_ride_updated   int;
    v_driver_updated int;
begin
    -- Guard: only transition rides that are currently 'ongoing'
    update public.rides
    set
        status            = 'completed',
        payment_reference = p_transaction_reference
    where id     = p_ride_id
      and status = 'ongoing';

    get diagnostics v_ride_updated = row_count;

    if v_ride_updated = 0 then
        raise exception 'Ride is not in ongoing status or does not exist (ride_id: %)', p_ride_id;
    end if;

    -- Credit the driver wallet atomically in the same transaction
    update public.drivers_metadata
    set wallet_balance = wallet_balance + p_amount_ghs
    where id = p_driver_id;

    get diagnostics v_driver_updated = row_count;

    if v_driver_updated = 0 then
        raise exception 'Driver not found in drivers_metadata (driver_id: %)', p_driver_id;
    end if;

    return jsonb_build_object(
        'ride_id',               p_ride_id,
        'driver_id',             p_driver_id,
        'transaction_reference', p_transaction_reference,
        'amount_credited_ghs',   p_amount_ghs
    );
end;
$$;

