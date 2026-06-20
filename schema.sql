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
