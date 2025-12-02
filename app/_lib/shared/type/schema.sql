-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create user_role enum
-- create type public.user_role as enum ('systemAdmin', 'admin', 'user');
-- user_role already exists in previous migrations

-- Create unions table
create table public.unions (
  id uuid not null default uuid_generate_v4(),
  name text not null,
  slug text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint unions_pkey primary key (id),
  constraint unions_slug_key unique (slug)
);

-- Update users table (assuming it exists from Supabase Auth, but defining extensions here)
-- Note: In a real migration, we would alter the existing table. 
-- Here we define the structure we expect/enforce.
alter table public.users add column if not exists union_id uuid references public.unions(id) on delete set null;
-- Remove is_system_admin if it exists (cleanup from previous version)

-- Add union_id to posts table
alter table public.posts add column if not exists union_id uuid references public.unions(id) on delete cascade;

-- Add union_id to notices table
alter table public.notices add column if not exists union_id uuid references public.unions(id) on delete cascade;

-- Create files table
create table public.files (
  id uuid not null default uuid_generate_v4(),
  name text not null,
  path text not null,
  size bigint not null,
  type text not null,
  bucket_id text not null,
  union_id uuid references public.unions(id) on delete set null,
  uploader_id text references public.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint files_pkey primary key (id)
);


-- 정책 관련된 사항은 추후 업데이트

-- Add RLS policies
-- alter table public.unions enable row level security;
-- alter table public.posts enable row level security;
-- alter table public.notices enable row level security;
-- alter table public.files enable row level security;

-- Unions: 
-- Everyone can read (to resolve slugs)
-- Only System Admins can insert/update/delete
-- create policy "Unions are viewable by everyone" on public.unions for select using (true);
-- create policy "Only System Admins can insert unions" on public.unions for insert with check (
--   exists (select 1 from public.users where id = auth.uid() and role = 'systemAdmin')
-- );
-- create policy "Only System Admins can update unions" on public.unions for update using (
--   exists (select 1 from public.users where id = auth.uid() and role = 'systemAdmin')
-- );
-- create policy "Only System Admins can delete unions" on public.unions for delete using (
--   exists (select 1 from public.users where id = auth.uid() and role = 'systemAdmin')
-- );

-- Posts:
-- Viewable if user belongs to the union of the post OR is System Admin
-- create policy "Posts viewable by union members" on public.posts for select using (
--   exists (select 1 from public.users where id = auth.uid() and role = 'systemAdmin') OR
--   exists (select 1 from public.users where id = auth.uid() and union_id = posts.union_id)
-- );

-- Notices:
-- Viewable if user belongs to the union of the notice OR is System Admin
-- create policy "Notices viewable by union members" on public.notices for select using (
--   exists (select 1 from public.users where id = auth.uid() and role = 'systemAdmin') OR
--   exists (select 1 from public.users where id = auth.uid() and union_id = notices.union_id)
-- );

-- Files:
-- Viewable if user belongs to the union of the file OR is System Admin
-- create policy "Files viewable by union members" on public.files for select using (
--   exists (select 1 from public.users where id = auth.uid() and role = 'systemAdmin') OR
--   exists (select 1 from public.users where id = auth.uid() and union_id = files.union_id)
-- );

-- Insert/Delete if user belongs to the union AND (is Admin OR System Admin OR is the uploader)
-- For simplicity, let's say any member of the union can upload, but deleting might be restricted.
-- Let's allow upload if member.
-- create policy "Files uploadable by union members" on public.files for insert with check (
--   exists (select 1 from public.users where id = auth.uid() and role = 'systemAdmin') OR
--   exists (select 1 from public.users where id = auth.uid() and union_id = files.union_id)
-- );

-- Delete if System Admin OR (Admin of that union) OR (Uploader)
-- create policy "Files deletable by union admins or uploader" on public.files for delete using (
--   exists (select 1 from public.users where id = auth.uid() and role = 'systemAdmin') OR
--   exists (select 1 from public.users where id = auth.uid() and union_id = files.union_id and role = 'admin') OR
--   (uploader_id = auth.uid())
-- );


-- -----------------------------------------------------------------------------
-- Supabase Storage Setup
-- -----------------------------------------------------------------------------

-- 1. Create 'files' bucket
insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;

-- 2. Storage RLS Policies
-- The structure in bucket is: [union_slug]/[filename]

-- Helper function to get union slug from path (optional, but we can do it with regex)
-- Or we just check union membership.

-- Policy: Allow read access to files if user belongs to the union corresponding to the folder
-- Path convention: union_slug/filename
-- We need to join with unions table to verify access. 
-- However, inside storage policies, complex joins can be tricky. 
-- A simpler approach is to check if the user is in the union that matches the folder name.
-- But storage.objects path_tokens is available.

-- SELECT (storage.foldername(name))[1] gives the first folder.

-- create policy "Allow View Access to Union Members"
-- on storage.objects for select
-- using (
--   bucket_id = 'files' and
--   (
--     exists (select 1 from public.users where id = auth.uid() and role = 'systemAdmin') OR
--     exists (
--       select 1 from public.unions u
--       join public.users usr on usr.union_id = u.id
--       where usr.id = auth.uid()
--       and u.slug = (storage.foldername(name))[1]
--     )
--   )
-- );

-- create policy "Allow Upload Access to Union Members"
-- on storage.objects for insert
-- with check (
--   bucket_id = 'files' and
--   (
--     exists (select 1 from public.users where id = auth.uid() and role = 'systemAdmin') OR
--     exists (
--       select 1 from public.unions u
--       join public.users usr on usr.union_id = u.id
--       where usr.id = auth.uid()
--       and u.slug = (storage.foldername(name))[1]
--     )
--   )
-- );

-- create policy "Allow Delete Access to Union Admins or Uploader"
-- on storage.objects for delete
-- using (
--   bucket_id = 'files' and
--   (
--     exists (select 1 from public.users where id = auth.uid() and role = 'systemAdmin') OR
--     (owner = auth.uid()) OR 
--     exists (
--       select 1 from public.unions u
--       join public.users usr on usr.union_id = u.id
--       where usr.id = auth.uid()
--       and usr.role = 'admin'
--       and u.slug = (storage.foldername(name))[1]
--     )
--   )
-- );
