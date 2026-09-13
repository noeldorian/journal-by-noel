-- Journal by Noel — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL Editor → New query),
-- then click "Run". Safe to re-run: every statement is idempotent.

-- ============================================================================
-- PROFILES — one row per user, created automatically on signup (see trigger below)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  avatar_initials text not null default '',
  timezone text not null default 'America/New_York',
  onboarding_completed boolean not null default false,
  instruments_traded text[] not null default '{}',
  trading_style text,
  priorities text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- USER SETTINGS — one row per user
-- ============================================================================
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'America/New_York',
  active_account_id text,
  default_account_id text,
  default_instrument text,
  default_risk_pct numeric not null default 0.5,
  default_session text not null default 'New York',
  theme text not null default 'dark',
  accent_color text not null default 'green',
  email_notifications boolean not null default true,
  push_notifications boolean not null default true,
  daily_summary boolean not null default true,
  weekly_summary boolean not null default true,
  sidebar_collapsed boolean not null default false
);

-- ============================================================================
-- ACCOUNTS — a trading account (prop eval, funded, personal, demo)
-- ============================================================================
create table if not exists public.accounts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null,
  broker text,
  starting_balance numeric not null default 0,
  current_balance numeric not null default 0,
  currency text not null default 'USD',
  account_size numeric not null default 0,
  risk_per_trade_pct numeric not null default 1,
  daily_loss_limit numeric not null default 0,
  profit_target numeric not null default 0,
  max_drawdown numeric not null default 0,
  max_contracts integer,
  max_trades_per_day integer,
  max_consecutive_losses integer,
  prop_firm_mode boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- STRATEGIES — playbook entries
-- ============================================================================
create table if not exists public.strategies (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  entry_criteria text not null default '',
  confirmation_criteria text not null default '',
  stop_loss_rules text not null default '',
  take_profit_rules text not null default '',
  invalidations text not null default '',
  preferred_sessions text[] not null default '{}',
  preferred_instruments text[] not null default '{}',
  notes text not null default '',
  screenshots jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- TRADES
-- ============================================================================
create table if not exists public.trades (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id text references public.accounts (id) on delete set null,
  date date not null,
  entry_time time not null,
  exit_time time not null,
  instrument text not null,
  direction text not null,
  session text not null,
  entry_price numeric not null,
  exit_price numeric not null,
  stop_loss numeric not null,
  take_profit numeric not null default 0,
  contracts numeric not null,
  fees numeric not null default 0,
  slippage numeric not null default 0,
  setup text,
  strategy_id text references public.strategies (id) on delete set null,
  tags text[] not null default '{}',
  psych_tags text[] not null default '{}',
  psychology jsonb,
  notes jsonb not null default '{}',
  screenshots jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trades_user_id_date_idx on public.trades (user_id, date);
create index if not exists trades_account_id_idx on public.trades (account_id);

-- ============================================================================
-- DAILY CHECK-INS (pre-market plan / post-market review)
-- ============================================================================
create table if not exists public.check_ins (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  type text not null check (type in ('pre', 'post')),
  bias text,
  levels text,
  max_daily_risk text,
  setups_watching text,
  invalidation text,
  followed_plan boolean,
  overtraded boolean,
  revenge_traded boolean,
  respected_risk boolean,
  what_worked text,
  what_didnt text,
  improve_tomorrow text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
create table if not exists public.notifications (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  type text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- CUSTOM TAGS — every tag a user has ever created, for autocomplete
-- ============================================================================
create table if not exists public.custom_tags (
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  primary key (user_id, name)
);

-- ============================================================================
-- SUBSCRIPTIONS — one row per user, mirrors their Stripe subscription state.
-- Only ever written by the server (webhook route, using the service-role
-- key) — regular users get read-only access so nobody can grant themselves
-- Premium by writing to this table directly.
-- ============================================================================
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'free',
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY — every table is private to its owning user
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.accounts enable row level security;
alter table public.strategies enable row level security;
alter table public.trades enable row level security;
alter table public.check_ins enable row level security;
alter table public.notifications enable row level security;
alter table public.custom_tags enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own accounts" on public.accounts;
create policy "own accounts" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own strategies" on public.strategies;
create policy "own strategies" on public.strategies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own trades" on public.trades;
create policy "own trades" on public.trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own check_ins" on public.check_ins;
create policy "own check_ins" on public.check_ins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own notifications" on public.notifications;
create policy "own notifications" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own tags" on public.custom_tags;
create policy "own tags" on public.custom_tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Read-only for the user — see the comment on the table definition above.
drop policy if exists "own subscription read" on public.subscriptions;
create policy "own subscription read" on public.subscriptions
  for select using (auth.uid() = user_id);

-- ============================================================================
-- AUTO-PROVISION a profile + settings row the moment someone signs up
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, avatar_initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    upper(
      left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 1) ||
      left(coalesce(new.raw_user_meta_data ->> 'last_name', ''), 1)
    )
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id, status)
  values (new.id, 'free')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- STORAGE — bucket for trade/strategy screenshots
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', true)
on conflict (id) do nothing;

-- Files must be uploaded under a path starting with the uploader's own user id,
-- e.g. `${user.id}/${trade.id}/before.png` — enforced below.
drop policy if exists "own screenshots read" on storage.objects;
create policy "own screenshots read" on storage.objects
  for select using (bucket_id = 'trade-screenshots');

drop policy if exists "own screenshots write" on storage.objects;
create policy "own screenshots write" on storage.objects
  for insert with check (
    bucket_id = 'trade-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "own screenshots update" on storage.objects;
create policy "own screenshots update" on storage.objects
  for update using (
    bucket_id = 'trade-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "own screenshots delete" on storage.objects;
create policy "own screenshots delete" on storage.objects
  for delete using (
    bucket_id = 'trade-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
