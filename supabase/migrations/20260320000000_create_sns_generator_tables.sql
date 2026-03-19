-- Create SNS Settings Table
create table if not exists public.sns_settings (
  platform text primary key,
  credentials jsonb default '{}'::jsonb,
  posts_per_day_min integer default 3,
  posts_per_day_max integer default 5,
  is_active boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create SNS Posts Table
create table if not exists public.sns_posts (
  id uuid default gen_random_uuid() primary key,
  platform text references public.sns_settings(platform) on delete cascade,
  content text not null,
  media_urls text[] default '{}',
  scheduled_at timestamp with time zone not null,
  posted_at timestamp with time zone,
  status text check (status in ('pending', 'posted', 'failed', 'generating')) default 'pending',
  error_log text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Initialize default platforms
insert into public.sns_settings (platform) values 
  ('tiktok'),
  ('facebook'),
  ('instagram'),
  ('viber'),
  ('telegram')
on conflict (platform) do nothing;

-- Enable RLS
alter table public.sns_settings enable row level security;
alter table public.sns_posts enable row level security;

-- Policies for sns_settings (Admin access relies on application logic, but allow authenticated users)
create policy "Enable read access for authenticated users" on public.sns_settings for select using (auth.role() = 'authenticated');
create policy "Enable insert for authenticated users" on public.sns_settings for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on public.sns_settings for update using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users" on public.sns_settings for delete using (auth.role() = 'authenticated');

-- Policies for sns_posts
create policy "Enable read access for authenticated users" on public.sns_posts for select using (auth.role() = 'authenticated');
create policy "Enable insert for authenticated users" on public.sns_posts for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on public.sns_posts for update using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users" on public.sns_posts for delete using (auth.role() = 'authenticated');
