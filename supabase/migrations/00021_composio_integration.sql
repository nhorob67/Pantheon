-- Composio integration configs
create table composio_configs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  instance_id uuid references instances(id) on delete set null,
  composio_user_id text not null,
  enabled boolean not null default false,
  selected_toolkits text[] not null default '{}',
  connected_apps jsonb not null default '[]'::jsonb,
  mcp_server_url text,
  composio_server_id text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint composio_configs_customer_id_key unique (customer_id)
);

-- Auto-update updated_at
create or replace function update_composio_configs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger composio_configs_updated_at
  before update on composio_configs
  for each row execute function update_composio_configs_updated_at();

-- RLS
alter table composio_configs enable row level security;

create policy "Users can view own composio config"
  on composio_configs for select
  using (customer_id in (select id from customers where user_id = auth.uid()));

create policy "Users can insert own composio config"
  on composio_configs for insert
  with check (customer_id in (select id from customers where user_id = auth.uid()));

create policy "Users can update own composio config"
  on composio_configs for update
  using (customer_id in (select id from customers where user_id = auth.uid()));

create policy "Users can delete own composio config"
  on composio_configs for delete
  using (customer_id in (select id from customers where user_id = auth.uid()));
