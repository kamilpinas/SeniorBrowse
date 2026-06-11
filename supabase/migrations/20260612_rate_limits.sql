-- Per-IP rate limiting for the public, unauthenticated edge functions
-- (audit finding #3). check-url in particular bills against the Google Safe
-- Browsing quota, so an unthrottled public proxy is a cost-exhaustion vector.
--
-- Mechanism: a single counter row per (endpoint + IP) key with a sliding
-- window. check_rate_limit() atomically increments and resets the window when
-- it expires, returning whether the request is under the limit.

create table if not exists public.rate_limits (
  key          text primary key,
  count        integer     not null default 0,
  window_start timestamptz not null default now()
);

-- Internal table — never exposed through the public API.
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon;
revoke all on public.rate_limits from authenticated;

-- Atomic check-and-increment. Returns true when the request is allowed
-- (count within p_limit for the current window), false when it should be
-- rejected with HTTP 429.
--
-- SECURITY DEFINER so the function owns the write; callers (service_role edge
-- functions) need no direct table grant.
create or replace function public.check_rate_limit(
  p_key            text,
  p_limit          integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_now   timestamptz := now();
begin
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 1, v_now)
  on conflict (key) do update
    set
      count = case
        when public.rate_limits.window_start
             < v_now - make_interval(secs => p_window_seconds)
        then 1
        else public.rate_limits.count + 1
      end,
      window_start = case
        when public.rate_limits.window_start
             < v_now - make_interval(secs => p_window_seconds)
        then v_now
        else public.rate_limits.window_start
      end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

-- Only the service role (edge functions) may invoke the limiter.
revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon;
revoke all on function public.check_rate_limit(text, integer, integer) from authenticated;
