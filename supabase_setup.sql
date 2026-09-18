-- =====================================================================
-- SHRI BAIJNATH HOSTEL - Supabase schema setup
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run
-- =====================================================================

create extension if not exists pgcrypto;

-- Resident / manager profiles (id = auth.users id)
create table if not exists public.profiles (
  id uuid primary key,
  email text,
  full_name text,
  role text not null default 'resident',
  aadhaar text,
  course text,
  permanent_address text,
  self_mobile text,
  parent_mobile text,
  room_number int,
  allotted_on date,
  created_at timestamptz not null default now()
);

-- Rooms
create table if not exists public.rooms (
  room_number int primary key,
  floor text not null,
  wing text not null,
  capacity int not null default 2,
  is_store boolean not null default false,
  monthly_rent numeric(12,2),
  created_at timestamptz not null default now()
);

-- Booking requests
create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null,
  full_name text,
  room_number int,
  course text,
  self_mobile text,
  parent_mobile text,
  aadhaar text,
  permanent_address text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Rent payments
create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null,
  full_name text,
  room_number int,
  month text not null,
  amount numeric(12,2),
  transaction_id text,
  receipt_path text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Enable RLS (no policies -> public anon key cannot read/write; only our
-- server using the service_role key, which bypasses RLS, can access data)
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.booking_requests enable row level security;
alter table public.rent_payments enable row level security;

-- Seed all 30 rooms (Room 05 = store room, not allotted)
insert into public.rooms (room_number, floor, wing, capacity, is_store) values
  (1,'Ground','North',2,false),
  (2,'Ground','North',2,false),
  (3,'Ground','South',2,false),
  (4,'Ground','South',2,false),
  (5,'Ground','Store',0,true),
  (6,'1st','South',2,false),
  (7,'1st','South',2,false),
  (8,'1st','South',2,false),
  (9,'1st','South',2,false),
  (10,'1st','South',2,false),
  (11,'1st','South',2,false),
  (12,'1st','North',2,false),
  (13,'1st','North',2,false),
  (14,'1st','North',2,false),
  (15,'1st','North',2,false),
  (16,'1st','North',2,false),
  (17,'2nd','South',2,false),
  (18,'2nd','South',2,false),
  (19,'2nd','South',2,false),
  (20,'2nd','South',2,false),
  (21,'2nd','South',2,false),
  (22,'2nd','South',2,false),
  (23,'2nd','North',2,false),
  (24,'2nd','North',2,false),
  (25,'2nd','North',2,false),
  (26,'2nd','North',2,false),
  (27,'2nd','North',2,false),
  (28,'3rd','South',2,false),
  (29,'3rd','South',2,false),
  (30,'3rd','North',2,false)
on conflict (room_number) do nothing;

-- Private storage bucket for payment receipts
insert into storage.buckets (id, name, public)
values ('payment-receipts','payment-receipts', false)
on conflict (id) do nothing;
