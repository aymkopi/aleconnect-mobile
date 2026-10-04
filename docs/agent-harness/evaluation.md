# Harness evaluation

The lean harness is a candidate improvement, not a measured agent-performance result. Harness tests check validator behavior; they do not establish coding correctness, speed, or lower usage.

## Compare representative tasks

Use the same model/settings, starting commit, user request, dependency state and acceptance criteria in separate disposable worktrees. Give each run only the request and its assigned harness. Use at least two runs per task/variant to expose variability. Keep production, credentials, actual devices and paid builds outside the comparison; use synthetic local fixtures and report unavailable acceptance separately.

| Case from recent work | Observable acceptance |
| --- | --- |
| Documentation correction | Correct fact/link, no unrelated edits, no unnecessary app build or workflow stack |
| Staff table or detail UI | Existing shared primitive, correct state/action semantics, focused tests and rendered checks |
| Staff/consumer account or report field | Compatible old/omitted/null readers, ownership/auth checks, both repo paths verified |
| Field action replay/partial receipts | Original IDs retained; omitted receipts pending; persisted actions survive retry; authorization preserved |
| MySQL lifecycle migration planning | Correct writer/reader/lock analysis, disposable rehearsal and rollback evidence; no live mutation |
| Expo/Metro or Android preview diagnosis | Installed config/runtime evidence; repair scoped to cause; build/device claims separated; saved work preserved |

Compare the preserved pre-cleanup guidance with the refined worktree version. Archived handoffs are evidence, not a complete old-harness baseline: reconstruct the old AGENTS, skill and validator files from the same verified Git base plus the captured documentation state. Do not replace a working repo's harness to run an experiment.

For each run record task ID, harness variant, repo base commits, model/settings, start/end times, acceptance results, regressions, unrelated changes, user interventions, token usage when available, required-reading volume and final artifact/diff. Missing usage is unavailable, not zero. Keep private traces outside Git.

Reject any variant that loses a contract, privacy, replay, rollback or authorization safeguard. Among correct runs, compare median elapsed time and usage plus intervention count. Keep sample size and failures visible; do not claim a universal winner from this small suite. Adopt additional process only when observed failures justify it.

## Current result

Final acceptance includes 160 local checks on Node 22.23.2, all project skill validations, primary app diagnostics, a six-scenario independent behavioral review, and an instruction-footprint comparison. See [final acceptance](final-acceptance.md). The four behavioral findings were corrected and rechecked. These are completed harness acceptance checks. A quantitative paired coding-agent benchmark remains an optional future experiment, not an unresolved update gate; no speed or token-saving claim is made.

Design references: [OpenAI harness engineering](https://openai.com/index/harness-engineering/), [task-specific skills and prompts](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra), and [Anthropic harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps).
