-- Timeline predictions were stored as English sentences ("Jupiter aspects natal
-- Moon (H8) — support on spiritual"), so they could not be shown in the reader's
-- language. The engine now also emits the template key and its values; the app
-- renders the sentence from those and falls back to `headline` for older rows.
alter table public.predicted_events
  add column if not exists headline_key text,
  add column if not exists headline_params jsonb;

comment on column public.predicted_events.headline_key is
  'i18n template key rendered as pages:timelineEvent.<key>; headline is the English fallback.';
comment on column public.predicted_events.headline_params is
  'Values for the template: planet, sign, area, house, lord, yoga, phase, level.';
