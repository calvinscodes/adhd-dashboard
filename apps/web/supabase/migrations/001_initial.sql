-- ADHD Dashboard — Initial Schema Migration
-- Run this in your Supabase SQL editor or via supabase db push

-- ============================================================
-- TABLES
-- ============================================================

-- users (extended profile — linked to Supabase auth.users)
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  xp integer default 0,
  level integer default 1,
  streak_count integer default 0,
  last_active_date date
);

-- categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  color text not null,
  icon text,
  "order" integer default 0,
  created_at timestamptz default now()
);

-- tasks
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  title text not null,
  description text,
  status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  template_id uuid,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- subtasks
create table if not exists subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  title text not null,
  status text default 'todo' check (status in ('todo', 'done')),
  "order" integer default 0,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- task templates (manual + learned by AI pattern matching)
create table if not exists task_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name_pattern text not null,
  category_id uuid references categories(id) on delete set null,
  description text,
  created_at timestamptz default now()
);

-- template subtasks
create table if not exists template_subtasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references task_templates(id) on delete cascade,
  title text not null,
  "order" integer default 0
);

-- xp audit log
create table if not exists xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  event_type text not null,
  xp_delta integer not null,
  created_at timestamptz default now()
);

-- brain dump entries
create table if not exists brain_dump (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists tasks_user_id_idx on tasks(user_id);
create index if not exists tasks_category_id_idx on tasks(category_id);
create index if not exists tasks_status_idx on tasks(status);
create index if not exists tasks_due_date_idx on tasks(due_date);
create index if not exists subtasks_task_id_idx on subtasks(task_id);
create index if not exists categories_user_id_idx on categories(user_id);
create index if not exists task_templates_user_id_idx on task_templates(user_id);
create index if not exists xp_events_user_id_idx on xp_events(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table users enable row level security;
alter table categories enable row level security;
alter table tasks enable row level security;
alter table subtasks enable row level security;
alter table task_templates enable row level security;
alter table template_subtasks enable row level security;
alter table xp_events enable row level security;
alter table brain_dump enable row level security;

-- users: can only read/write own row
create policy "users_own" on users
  for all using (auth.uid() = id);

-- categories: own rows only
create policy "categories_own" on categories
  for all using (auth.uid() = user_id);

-- tasks: own rows only
create policy "tasks_own" on tasks
  for all using (auth.uid() = user_id);

-- subtasks: via task ownership
create policy "subtasks_own" on subtasks
  for all using (
    exists (
      select 1 from tasks where tasks.id = subtasks.task_id and tasks.user_id = auth.uid()
    )
  );

-- task_templates: own rows only
create policy "task_templates_own" on task_templates
  for all using (auth.uid() = user_id);

-- template_subtasks: via template ownership
create policy "template_subtasks_own" on template_subtasks
  for all using (
    exists (
      select 1 from task_templates where task_templates.id = template_subtasks.template_id and task_templates.user_id = auth.uid()
    )
  );

-- xp_events: own rows only
create policy "xp_events_own" on xp_events
  for all using (auth.uid() = user_id);

-- brain_dump: own rows only
create policy "brain_dump_own" on brain_dump
  for all using (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-seed default categories for new users
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Insert user profile
  insert into public.users (id, email)
  values (new.id, new.email);

  -- Seed default categories
  insert into public.categories (user_id, name, color, icon, "order") values
    (new.id, 'Work', '#3B82F6', '💼', 0),
    (new.id, 'Personal', '#22C55E', '🏠', 1),
    (new.id, 'Ideas / Brain Dump', '#EAB308', '💡', 2),
    (new.id, 'Projects', '#A855F7', '🚀', 3);

  -- Create empty brain dump entry
  insert into public.brain_dump (user_id, content)
  values (new.id, '');

  return new;
end;
$$;

-- Trigger: fire on new auth user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Function: update streak on task completion
create or replace function update_user_streak(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_last_active date;
  v_today date := current_date;
begin
  select last_active_date into v_last_active from public.users where id = p_user_id;

  if v_last_active is null or v_last_active < v_today - interval '1 day' then
    -- Reset streak (gap > 1 day) or first completion
    update public.users
    set streak_count = 1, last_active_date = v_today
    where id = p_user_id;
  elsif v_last_active = v_today - interval '1 day' then
    -- Consecutive day — increment
    update public.users
    set streak_count = streak_count + 1, last_active_date = v_today
    where id = p_user_id;
  end if;
  -- If v_last_active = v_today, no change needed
end;
$$;

-- ============================================================
-- REALTIME PUBLICATIONS
-- Enable realtime for key tables
-- ============================================================

-- These commands enable realtime for the tables
-- (Run separately if needed — some Supabase configs need UI)
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table subtasks;
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table brain_dump;
