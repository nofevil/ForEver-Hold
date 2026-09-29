create table if not exists holds (
  user_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists campaigns (
  id text primary key,
  owner_user_id text not null,
  name text not null default '',
  join_code text not null unique,
  epoch text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_owner_idx on campaigns (owner_user_id);

create table if not exists campaign_seats (
  id text primary key,
  campaign_id text not null references campaigns (id) on delete cascade,
  user_id text not null,
  character_id text not null,
  name text not null default '',
  profession text not null default '',
  health integer not null default 0,
  health_max integer not null default 0,
  dp integer not null default 0,
  dp_max integer not null default 0,
  seated_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create index if not exists campaign_seats_campaign_idx on campaign_seats (campaign_id);
