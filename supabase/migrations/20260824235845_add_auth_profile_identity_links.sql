create table if not exists public.auth_profile_identity_links (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  linked_email text not null,
  link_reason text not null default 'verified_email_legacy_bridge',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.auth_profile_identity_links enable row level security;
revoke all on public.auth_profile_identity_links from anon, authenticated;
grant select, insert, update, delete on public.auth_profile_identity_links to service_role;

insert into public.auth_profile_identity_links (auth_user_id, profile_id, linked_email, link_reason)
select a.id, p.id, lower(a.email), 'verified_email_legacy_bridge'
from auth.users a
join public.profiles p on lower(p.email) = lower(a.email)
where a.email_confirmed_at is not null
  and a.id <> p.id
on conflict (auth_user_id) do update
set profile_id = excluded.profile_id,
    linked_email = excluded.linked_email,
    link_reason = excluded.link_reason,
    updated_at = now();

create index if not exists auth_profile_identity_links_profile_idx
  on public.auth_profile_identity_links (profile_id);
