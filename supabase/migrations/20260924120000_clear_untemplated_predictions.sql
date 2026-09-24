-- Predictions cached before the timeline was localised carry only the English
-- sentence (headline_key is null). They are still inside their window, so the
-- cache is served and never recomputed — leaving those charts stuck on English.
-- Dropping them is safe: the next visit recomputes from the birth chart.
delete from public.predicted_events
where headline_key is null;
