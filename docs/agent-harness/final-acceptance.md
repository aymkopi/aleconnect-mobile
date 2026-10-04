# Final harness acceptance

The finalization trees start from Staff 4079c07, Lineman cc07760 and Mobile 23c5be1. Ten concurrently updated documents were captured before integration, in addition to the six original handoff/history archives. Product source, dependency lockfiles and CI configuration are unchanged.

## Executed checks

- Focused suites: Staff 57/57, Lineman 54/54, Mobile 49/49 (160 total), executed under Node 22.23.2.
- All three harness commands, document-link/archive integrity and whitespace checks pass.
- Official Skill Creator quick_validate.py passes all 13 project skills through an isolated uv environment with PyYAML and UTF-8 enabled; no repository dependencies changed.
- Read-only app diagnostics pass in all primary checkouts under Node 22.23.2. Negative cases reject incompatible Node, missing tools, invalid explicit siblings and broken metadata.
- Final independent script review also caught CLI argument bypass and invalid YAML scalar/nested-field acceptance. Both were fixed, covered by negative regression tests and independently approved.
- Fresh independent six-scenario behavioral review found four issues: broad consumer skill loading, a map-specific general acceptance link, retired executable Metro paths, and plan-only migration rehearsal ambiguity. All four were corrected and independently rechecked with no remaining behavioral blocker.
- Graphify AST refresh is recorded separately; generated outputs are retained externally and excluded from scoped commits.

## Instruction footprint

| Repo | Previous AGENTS/map/active words | Routine entry words | Resumed AGENTS/map/active words |
| --- | ---: | ---: | ---: |
| aleconnect | 44671 | 356 | 946 |
| aleconnect-lineman | 10349 | 330 | 906 |
| aleconnect-mobile | 6681 | 329 | 880 |

Counts use whitespace-delimited words, not model tokens. Previous startup guidance is the current pre-integration AGENTS, map and active-work files; routine refined tasks read AGENTS and relevant source. Resumed/coordinated tasks still consult task handoffs and contracts as needed. This measures instruction volume only, not agent speed, correctness or inference cost.

## Limits

Behavioral review is a read-only scenario check, not a coding benchmark or device/runtime acceptance. Global plugins retain their settings. A quantitative paired coding-agent experiment is optional follow-up; it is not a release gate for this documentation/harness update. No performance gain is claimed. Product builds/live requests/native releases were not needed or performed.

## Integration

The scoped changes are committed in isolated trees and integrated into the corresponding local main/main/master branches by fast-forward; the actual commit IDs are available in Git. Merged-tree acceptance is verified before this task closes. Keep remote push, production deployment, native publication and unrelated worktree cleanup outside this request.
