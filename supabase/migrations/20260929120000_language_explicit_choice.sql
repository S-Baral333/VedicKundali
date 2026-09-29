-- profiles.language was added with DEFAULT 'en' (20260613043045), which
-- backfilled every row that already existed. useLanguage then treats the server
-- value as authoritative, so a user reading in Nepali via localStorage was
-- silently switched to English the moment they opened /profile — the only page
-- where LanguageSelector mounts — and the switch was written back to the
-- server, so it followed them to every device.
--
-- The missing fact is whether the stored language was ever actually chosen.
-- 'en' in this column means either "the user picked English" or "nobody ever
-- picked anything", and those must not be treated the same way.
--
-- language_updated_at records a deliberate choice. NULL means the value is
-- just the column default and must not override what the client has.
alter table public.profiles
  add column if not exists language_updated_at timestamptz;

comment on column public.profiles.language_updated_at is
  'When the user last explicitly chose their language. NULL means profiles.language is only the column default and must not be reconciled onto the client — see useLanguage.ts.';

-- Existing rows keep NULL: we cannot know retrospectively which of them chose
-- English and which were merely defaulted, and assuming they chose it would
-- re-create the bug for everyone it is currently affecting. The client writes
-- this the first time a language is set from here on, which heals each profile
-- on its owner's next visit.
