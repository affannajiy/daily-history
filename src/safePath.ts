/**
 * Confines every file the job writes to the workspace it is running in.
 *
 * Two directories are configurable — `ARCHIVE_DIR` and `SENT_LOG_PATH` — because
 * the workflow checks `gh-pages` out into a sibling folder and points them at it.
 * Both are joined straight into `writeFileSync`, so a wrong value does not fail
 * loudly, it writes somewhere unexpected and the run still reports success.
 *
 * The environment here is set by the workflow, not by a visitor, so this is not
 * closing an attack path so much as refusing to act on a value it cannot verify:
 * a typo in a workflow env line should stop the run, not scatter HTML across the
 * runner. Code scanning traces `process.env` as untrusted input and flags every
 * one of those writes; a containment check answers that in the code rather than
 * by dismissing nine alerts.
 */

import { resolve, sep } from "path";

/**
 * Resolves `target` and asserts it stays inside the current working directory.
 * Returns the absolute path — callers should use it, so the value that was
 * checked is the value that gets written.
 */
export function safePath(target: string, label: string): string {
  const root = resolve(process.cwd());
  const full = resolve(root, target);
  if (full !== root && !full.startsWith(root + sep)) {
    throw new Error(
      `${label} resolves outside the working directory and was refused: ${target}`
    );
  }
  return full;
}
