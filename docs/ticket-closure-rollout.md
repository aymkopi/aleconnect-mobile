# Ticket closure rollout

Source implementation only. Production application, deployment, feature enablement and native distribution require their own authorized release. Billing is excluded.

## Preparation

1. Record current Staff/API/maintenance versions, bindings, flags and schedules and preserve rollback bundles. Keep existing report queues, receipts, APKs and device data.
2. Inspect the intended database using the pinned Node24 runtime and its existing private environment, without copying credentials:

   ```powershell
   node --env-file=<private-environment-file> scripts/apply-ticket-closure.mjs --inspect
   ```

   Verify the actual server/database identity and returned target fingerprint. The inspected development target on October29 was `defaultdb`, server UUID `dd78b83d-cdfe-11f1-bfec-c617a1b56df6`; inspect again before any application. Never substitute a remembered fingerprint.
3. With explicit target/migration authorization, run `--apply --expect-target <fingerprint> --snapshot <new-private-file>`. It adds nullable `tickets.close_due_at DATETIME(3)` and `(status,close_due_at)` index only. Read back both definitions and existing record counts/checksums. Retain the exclusive snapshot outside Git.
4. Deploy compatible API, Staff UI, push dispatcher and ticket maintenance with `TICKET_CLOSURE_ENABLED` unset/false. Existing consumer flags remain unchanged. Verify old reads/receipts and new-code version before activation. The new column must exist before enabling this policy.

## Activation

1. Stop old follow-up producers/deadline processing during the cutover. Set `CONSUMER_REPORT_UPDATES_WRITES_DISABLED=true` consistently on API and old maintenance; keep reads/receipt recovery enabled. Suppress outstanding obsolete reminder delivery by enabling the new policy on the push dispatcher before resuming sends. Preserve all unrelated runtime settings and bindings.
2. Enable `TICKET_CLOSURE_ENABLED=1` on the API first. New genuine resolution transactions now stamp their own24-hour deadline; new exchange/reopen/upload commands are retired, while exact committed legacy receipts still replay. Keep closure maintenance paused through `OPERATIONAL_MAINTENANCE_MODE` on its Worker while preparing activation. Existing first ratings remain optional on Resolved/Closed reports; retain the existing service-feedback capability/write settings.
3. Record one fresh UTC rollout instant and immediately run:

   ```powershell
   node --env-file=<private-environment-file> scripts/apply-ticket-closure.mjs --activate --expect-target <fingerprint> --snapshot <new-private-file> --at <recorded-UTC-time>
   ```

   Activation locks currently Resolved tickets with a null deadline, snapshots that exact set before updating, gives it rollout+24hours, and checks affected rows/deadlines before commit. It rejects a future/backdated (>5minutes) rollout instant or more than2000 legacy records. A larger set needs a reviewed batched procedure; do not bypass the guard. Repeating activation does not retime populated deadlines. Active redispatched and Closed records stay unchanged.
4. Independently compare snapshot IDs/counts, exact grace deadline, active-ticket checksum and new-resolution deadlines. Then enable the same policy on ticket maintenance and resume it. It processes at most25 eligible tickets per minute by default, rechecking canonical locked state. Protected inconsistent cases do not block later due work. Verify the current Worker version/schedule and read-only backlog age/count.
5. Check consumer-owned detail policy, immutable legacy receipt replay and Dispatcher/Admin visibility without sending live business commands. Closure keeps ordinary status in-app/push notifications and preference enforcement; the superseded follow-up reminder is suppressed.
6. Distribute the compatible Mobile build only after Staff acceptance. Native acceptance must demonstrate mandatory full-Albay setup, original-pack resume, cold offline roads/fonts/icons at detailed zoom, offline cached-account drafting and reconnect with fresh access. Test Android and iOS independently; Windows source tests do not establish iOS build/device acceptance.

## Rollback and monitoring

- Pause new closure processing/writes first; preserve compatible readers and every populated deadline, receipt, score, audit and already Closed status. Never reopen tickets or erase local work as rollback.
- Keep old48-hour processing disabled. Turning off the new policy alone resumes the legacy branch unless old report-update writes stay paused. A temporary API write pause may block receipt recovery at the handler; leave the supported policy/receipt paths available whenever possible.
- Restore only the recorded compatible API/UI/maintenance versions and original unrelated runtime settings. An older Mobile must update or create another ticket when it receives `FOLLOWUP_RETIRED`; it cannot start a new exchange.
- `--rollback --expect-target <fingerprint>` removes only completely unused additive schema. It refuses any nonnull deadline. Do not run it after activation or any new writer use.
- Observe overdue Resolved backlog, Worker failures, status notification delivery and privacy-safe rating failures. Inconsistent memo membership stays protected for Staff investigation. Do not infer native/provider acceptance from browser fixtures or build success.
