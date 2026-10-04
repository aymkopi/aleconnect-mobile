# Documentation map

Start with [active work](agent-harness/active-work.md) and use [the harness map](agent-harness/index.md) for task-specific reading.

| Need | Document | Use |
| --- | --- | --- |
| Local setup/build | [Repository README](../README.md) | Current commands; installed versions come from package/lockfiles |
| Product decisions | [PRODUCT.md](../PRODUCT.md) | Audience and interaction principles |
| Server ownership/compatibility | [Contracts](agent-harness/cross-project-contracts.md) | Snapshot of Staff authority; inspect Staff when changing the boundary |
| Previous outcome/release | [History](agent-harness/implementation-history.md) | Compact outcomes and full dated archive |
| Native release/hardening | [Tracker](mobile-release-hardening-tracker.md), [plan](mobile-release-hardening-plan.md) | Dated gate evidence; verify applicability to current SDK/build |
| Consumer API refresh | [Coverage matrix](implementation/2026-09-13-mobile-api-refresh-matrix.md) | Dated response/UI coverage; current Staff handlers remain authority |
| Designs and plans | `superpowers/specs/`, `superpowers/plans/` | Historical decisions unless the current handoff names them as active |

Preserve old acceptance and rollback facts. Replace superseded active status, record new outcomes once in history, and keep contract details in the contract document. A passing old tracker does not prove current device, native SDK or backend acceptance.
