// Shared helper for the writes that cannot fail the request.
//
// Every Supabase write returns its error in the resolved value rather than
// throwing, so `await client.from(t).update(x).eq(...)` succeeds as an
// expression even when the row was never touched. That is how the free tier
// came to be unlimited — see the doc comment on recordUsageEvent in usage.ts —
// and the same shape appeared in every generator that caches its output.
//
// What to do about it is a property of the call site, not a preference. The
// question is never "is this write important" — they all are — but "does
// aborting actually prevent the bad state":
//
//   1. It does, because nothing has been spent yet and a later reader would
//      take the missing write as truth. compute-predictions and
//      generate-predictions clear a chart's events before regenerating them:
//      if that delete is lost and the insert lands, the chart carries two
//      generations at once and the timeline prints each twice. Both abort, and
//      neither has called a model yet, so the retry is free. Those sites do not
//      use this module; they read the error and throw, beside the insert whose
//      check they mirror.
//
//   2. It does not, because the work is already delivered — the reading has
//      streamed, the remedies are in the response body, the horoscope's failure
//      marker is the last act of a background task with no caller left to tell.
//      Aborting would destroy a result the user is holding and change nothing
//      about the lost row. Log and carry on: persistOrLog.
//
// Beware of reaching for (1) just because a write comes in a delete-then-insert
// pair. None of these pairs is transactional, so a throw between the two does
// not undo the delete — it only adds a failed request to a table that is
// already half-updated. generate-timeline is the case that makes this concrete:
// its reminder swap happens after the AI run, so aborting would cost a finished
// timeline and still leave the user with no reminders. Gating the insert on the
// delete's result is what removes the corrupting outcome there, which is why
// this function returns a boolean rather than just logging.
//
// So: prevent the bad state by ordering the writes where you can, abort only
// where aborting is what prevents it, and log the rest. What is never an option
// is discarding the error. An unlogged failure is silent data loss — the user
// reopens the chart, the cache is empty, the expensive generation runs again,
// and nothing says why.
//
// Grep `[persist] FAILED` in the function logs to find every such loss.

/** The shape every Supabase write resolves to, narrowed to the part that matters. */
type WriteResult = { error: unknown };

/** Where the write came from, so a log line identifies itself without a stack. */
type WriteSite = {
  /** Edge function name, e.g. "generate-remedies". */
  fn: string;
  /** Table written to, e.g. "birth_charts". */
  table: string;
  /** What was being saved, specific enough to find the affected row. */
  detail: string;
};

/**
 * Await a write whose failure must be visible but must not fail the request.
 *
 * Never throws — by the time this runs the caller already has its result, so a
 * rejection here would turn a lost cache row into a failed request. A network
 * error and a Postgres error are logged identically; both mean the row is gone.
 *
 * Returns whether the write landed, so a caller that can still react (stop
 * advertising a cache, mark a job differently) has the option. Ignoring the
 * return value is fine and expected at most sites.
 */
export async function persistOrLog(
  write: PromiseLike<WriteResult>,
  site: WriteSite,
): Promise<boolean> {
  const lost = (cause: unknown) =>
    console.error(
      `[persist] FAILED ${site.fn} → ${site.table}: ${site.detail} was not saved —` +
        " nothing was aborted, so this loss is invisible outside this log line:",
      cause,
    );

  try {
    const { error } = await write;
    if (error) {
      lost(error);
      return false;
    }
    return true;
  } catch (e) {
    lost(e);
    return false;
  }
}
