// Shared helper for the writes that cannot fail the request.
//
// Every Supabase write returns its error in the resolved value rather than
// throwing, so `await client.from(t).update(x).eq(...)` succeeds as an
// expression even when the row was never touched. That is how the free tier
// came to be unlimited — see the doc comment on recordUsageEvent in usage.ts —
// and the same shape appeared in every generator that caches its output.
//
// There are only two honest things to do with such a write, and which one
// applies is a property of the call site, not a preference:
//
//   1. The write still has consequences the caller can act on — a cache the
//      next request will read as truth, or the first half of a
//      delete-then-insert pair whose failure leaves duplicates or nothing at
//      all. Check the error inline and abort the request. Those sites do not
//      use this module; they read the error and throw, next to the code whose
//      failure they mirror.
//
//   2. The work is already delivered. The reading has streamed, the remedies
//      are in the response body, the horoscope's failure marker is the last act
//      of a background task with no caller left to tell. Aborting would destroy
//      a result the user is holding and change nothing about the lost row. Log
//      it under a marker someone can grep for, and carry on — that is
//      persistOrLog.
//
// The distinction that matters: (2) is not "ignore the error". An unlogged
// failure here is silent data loss — the user re-opens the chart, the cache is
// empty, the expensive generation runs again, and nothing in the logs says why.
//
// Grep `[persist] FAILED` in the function logs to find every one of them.

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
