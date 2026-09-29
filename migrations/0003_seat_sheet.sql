alter table campaign_seats add column if not exists sheet jsonb;
alter table campaign_seats add column if not exists target_id text not null default '';
