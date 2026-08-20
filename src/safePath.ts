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
 * by dismissing eleven alerts.
 */

import { resolve, sep } from "path";

/**
 * Resolves `target` and asserts it stays inside the current working directory.
 * Returns the absolute path — callers should use it, so the value that was
 * checked is the value that gets written.
 *
 * The shape of the check matters as much as its effect. It is one `startsWith`
 * against a resolved prefix, with nothing else in the condition: that is the
 * form CodeQL recognises as a path-injection barrier, and an earlier version
 * that also allowed the root itself (`full !== root && !full.startsWith(...)`)
 * was correct but unrecognised, so every write downstream stayed flagged. The
 * cost is that `ARCHIVE_DIR="."` is now refused — writing the archive into the
 * repository root was never a supported configuration.
 *
 * The separator is part of the prefix on purpose. Without it a sibling whose
 * name merely begins with the root's — `/work/repo-backup` against
 * `/work/repo` — would pass.
 */
export function safePath(target: string, label: string): string {
  const root = resolve(process.cwd()) + sep;
  const full = resolve(root, target);
  if (!full.startsWith(root)) {
    throw new Error(
      `${label} resolves outside the working directory and was refused: ${target}`
    );
  }
  return full;
}
