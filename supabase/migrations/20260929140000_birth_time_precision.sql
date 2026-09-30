-- Onboarding offers a "skip birth time" checkbox, but generate-chart rejects
-- any request without birth_time (400 Missing required fields). So the app
-- invites people to skip the one field it cannot proceed without, and they end
-- up with an account that can never cast a chart.
--
-- The fix is to let them name a part of the day instead. That narrows 24 hours
-- to roughly six, which is enough for the Moon — but nowhere near enough for
-- the lagna, which moves through about three signs in that window. So the chart
-- has to carry how precise its birth time actually was, or a reading will cite
-- a guessed ascendant to the decimal and present it as fact.
--
--   exact   — the user gave a clock time
--   period  — the user named a part of the day; birth_time holds its midpoint
--   unknown — no time at all (legacy rows only; no new row should be this)

alter table public.profiles
  add column if not exists birth_time_accuracy text
    check (birth_time_accuracy in ('exact', 'period', 'unknown')),
  add column if not exists birth_time_period text;

alter table public.birth_charts
  add column if not exists birth_time_accuracy text
    check (birth_time_accuracy in ('exact', 'period', 'unknown')),
  add column if not exists birth_time_period text;

-- Backfill is knowable here, unlike profiles.language: generate-chart has always
-- required a birth_time, so every existing chart was cast from one the user
-- actually typed. Profiles are split on whether the field was ever filled in.
update public.birth_charts
   set birth_time_accuracy = 'exact'
 where birth_time_accuracy is null;

update public.profiles
   set birth_time_accuracy = case when birth_time is null then 'unknown' else 'exact' end
 where birth_time_accuracy is null;

comment on column public.profiles.birth_time_accuracy is
  'How precise birth_time is: exact (clock time given), period (part of day named; birth_time is that period''s midpoint), unknown (none given). Readings must not cite lagna, houses, dasha dates or divisional charts as fact unless this is ''exact'' — see src/lib/birth-time.ts.';

comment on column public.birth_charts.birth_time_accuracy is
  'Precision of the birth_time this chart was actually cast from. Copied from the profile at generation time so a reading can tell what it is allowed to claim.';
