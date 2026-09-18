# Checkpoint 7: Authoritative Amira ID + Account Identity Foundation

## 1. Baseline commit/branch

`amira-v2`, `96c3fcf`. Initial working tree was clean. All work remained local.

## 2. Exact files modified/new

Modified:

- `firestore.rules`
- `functions/src/index.js`
- `functions/src/hostActivity.js`
- `functions/src/hostDiscovery.js`
- `functions/src/__tests__/callPaymentLifecycle.test.js`
- `src/context/UserContext.js`
- `src/screens/main/MyProfileScreen.js`
- `src/screens/main/UserProfileScreen.js`
- `src/screens/main/__tests__/profileViewTrackingUi.test.js`
- `src/screens/main/__tests__/rewardsUi.test.js`

New:

- `functions/src/amiraIdDomain.js`
- `functions/src/amiraIdentity.js`
- `functions/src/__tests__/amiraIdDomain.test.js`
- `src/components/AmiraIdentity.js`
- `src/components/__tests__/amiraIdentity.test.js`
- `src/services/amiraIdentityService.js`
- `src/services/__tests__/amiraIdentityService.test.js`
- `src/services/__tests__/amiraIdentity.emulator.cjs`
- `docs/amira-id-account-identity-report.md`
- `docs/amira-id-account-identity-git-status.txt`

## 3. Existing identity architecture found

Firebase Auth UID remains the internal account/document/navigation authority. Existing `ensureUserProfile` creates/hydrates the user profile after auth; `UserContext` subscribes to its updates. One existing My Profile screen serves both account roles; the existing User Profile screen serves permitted full target profiles through backend public projections. Existing normalization preserves additional stored fields. No existing Amira ID allocator/reservation/public-ID field or Copy-number full-profile feature was found.

## 4. Existing/fake/legacy Amira ID behavior found

No persisted Amira ID policy or static production-like Amira ID fixture existed in the audited source. The existing quick-account flow generates a nine-digit `accountId` used in a login email and credential dialog; it is a login credential, not a public Amira ID, and was not changed or repurposed. Existing `AMIRA-` referral codes derived from UID fragments remain explicitly labelled referral codes in Invite & Earn; they are not Amira IDs. Withdrawal Account Number fields are payout details, not public identity. Existing UID diagnostic logging/internal routing remains unchanged and is not displayed as an Amira ID.

Post-test searches for `AMR-`, `amiraId`, account/user number and generated IDs found only the new canonical allocator/format helper, full-profile integration, local tests, and documentation for Amira ID. Existing media/legacy-ledger randomness, quick-account credentials and referral derivation are separate systems, untouched and never used by this allocator.

## 5. Final canonical format

Strict `^AMR-[0-9]{6}$`: uppercase prefix, exactly six decimal digits. Inclusive namespace `AMR-000000` through `AMR-999999`: 1,000,000 possible IDs. Leading zeros are retained. Lowercase, trimmed alternatives, missing punctuation, longer/shorter numbers and nonnumeric suffixes are invalid. No persisted malformed value is silently normalized.

## 6. Exact authoritative storage model

Existing `users/{uid}.amiraId` stores the canonical string. It is assigned or restored only by trusted backend transactions, immutable for normal clients, independent of role/application, and separate from private credentials and internal UID. No alternate identity field or Host-specific ID was added.

## 7. Exact reservation/index model

`amiraIds/{canonicalAmiraId}` contains only `uid`, server `createdAt`, `version: 1`. Document identity reserves the public number. An indexed `where(uid == authUid).limit(2)` lookup proves zero, one or conflicting multiple reservations for an account without scanning the collection. Normal clients cannot read, enumerate, create, update or delete reservations; even client admin claims receive no rule access to this collection. Trusted Admin SDK/server operations remain outside client rules.

## 8. Exact allocation algorithm

Require authenticated owner and empty payload. Select one server candidate per application attempt. Inside a Firestore transaction, read the user, then its bounded reverse reservation query. Reject missing/demo users and inconsistent stored mappings. If existing mapping is valid, return its ID (or restore missing user field from one proven reservation). Otherwise read the candidate reservation; if occupied, return a collision result without writes. If free, transactionally create its reservation and update the same user field, then return the canonical ID. All reads precede writes. Candidate collisions are retried outside the transaction, not by looping writes inside a transaction. SDK retries reuse that attempt's candidate and re-read current state.

## 9. Randomness source

Production uses Node `crypto.randomInt(1_000_000)`, formatted with six digits. No Math.random, client candidate/seed, UID hash, email, phone or private-data derivation. Deterministic candidate functions exist only as trusted server-factory dependency injection for local tests; callable payloads cannot select them.

## 10. Retry bound and failure behavior

At most 20 application candidate attempts; Firestore can independently retry an attempt's transaction. Occupied numbers are never overwritten. Twenty collisions return `resource-exhausted` with a safe temporary-unavailable message, without a partial user field/reservation. This is a bounded allocation failure, not proof that all numbers are occupied. Namespace saturation raises collision probability; actual full exhaustion also fails safely. No scan, duplicate, UID fallback or second format. Future format versioning/capacity planning is required before saturation, but was not implemented here.

## 11. Same-UID idempotency

Concurrent transactions share the same user document and indexed consistency reads. Once one commits, others retry and return the same reservation/field instead of issuing another ID. Existing matching mappings return unchanged ID and creation timestamp across ensure/login/reinstall/profile refresh. Emulator asserts three simultaneous ensures return one ID and one reservation.

## 12. Cross-UID collision behavior

Candidate reservation existence/create is authoritative. Two accounts racing for one candidate cannot both create it. One wins; the other re-reads occupied state and tries its next candidate, or fails safely at the bound. Emulator exercises deterministic cross-UID contention and verifies distinct IDs and exact reservation owners.

## 13. Partial/inconsistent mapping policy

| State | Policy |
| --- | --- |
| Valid field + exactly one matching canonical reservation, owner/version/time valid | Return unchanged ID |
| No user field + exactly one canonical reservation owned by this UID, version 1 and valid timestamp type | Transactionally restore only user field; no new reservation/ID |
| Valid user field but reservation absent | Fail closed; trusted repair required |
| Field points to another owner or another reservation | Fail closed; never transfer/overwrite |
| Two or more reservations found for UID | Fail closed; no guessing |
| Malformed/null persisted field or malformed reservation metadata | Fail closed; no normalization/replacement |
| No field and no reservation | Allocate atomically |

Reservation-only recovery uses an indexed bound of two, not an unsafe scan. Public projection is read-only and does not repair or allocate; missing/conflicting identity returns null and is omitted by target-profile UI. Operational query failures still propagate through the existing profile error path.

## 14. Legacy account behavior

Lazy authenticated ensure assigns only genuinely absent mappings. It verifies already-assigned authority before use. Any malformed/duplicate/conflicting legacy field requires trusted repair. No production accounts were inspected/backfilled and no ID was derived from UID. Existing unrelated login/referral fields are not considered identity authority. Demo-marked accounts are denied allocation. Local fixture mappings exist only in isolated Jest/emulator tests.

## 15. Consumer -> Host permanence

Allocator does not inspect role/application/approval for ID selection. Pending, rejected, resubmitted or approved status cannot regenerate it. Existing approval mutations preserve unrelated user fields; no approval source was modified. Emulator verifies the same ID before pending, rejection and trusted Host approval, then verifies the promoted Host's full public profile returns that same ID/reservation owner. Permanent role transition remains unchanged.

## 16. Firestore rule protections

New user creation cannot include `amiraId`. Normal updates must retain both its presence and exact value, preventing addition, change, null insertion or deletion. Another user's writes remain denied. `amiraIds` direct reads and writes are false. Existing Admin user-update branch remains trusted; no rule broadened. Valid profile edits preserving identity and existing Consumer application submission remain possible. Protected approval, availability, rates, Level, earnings and view identities retain their prior rules and passed regressions.

## 17. Callable/API authorization and accepted payload

`ensureAmiraId()` binds UID to existing `requireAuth`. Accepted payload is `{}` or omitted data. Reject null, arrays, nonobjects and any property, including requested ID/UID/seed/role/time. It cannot target another account, reserve arbitrary numbers or look up someone by ID. UID must be a valid nonempty document segment of at most 128 characters. Return only `{amiraId}`; no reservation UID/timestamp/version metadata. It reuses existing region/callable and emulator configuration.

## 18. Own Consumer Profile display

My Profile uses shared `AmiraIdentity` under its public identity area. On focus it ensures current own identity and displays canonical ID with Copy; loading/unavailable/retry are separate. It does not trust cached user fields alone or fall back to Firebase UID. Assignment failure does not block app navigation/authentication.

## 19. Own Host Profile display

The same My Profile component shows the same permanent ensured ID for approved Hosts. No Host-specific allocator or identity state. Stale requests are cancelled and display state is keyed to current UID to prevent a previous account's ID appearing/copying during account changes.

## 20. Consumer viewing Host full profile

Existing full Host backend projection verifies canonical field and matching unique reservation through read-only helper before adding `amiraId`. Existing full User Profile displays it when available. Missing/conflicting identity is omitted; it does not allocate for the target. Consumer discovery projections/cards remain untouched and contain no new ID.

## 21. Host viewing Consumer full profile

Existing safe Consumer full-profile endpoint adds only verified canonical public ID. Existing User Profile renders it while retaining authoritative Level and Follow/Friends/message/block behavior. Public compact Consumer projection and Activity actors are unchanged; raw reservation/private metadata is never returned.

## 22. Copy behavior

Copies exactly the displayed canonical Amira ID string through existing installed Expo Clipboard. Never UID, private credential/email/phone, mapping metadata or a malformed/temporary value. Success alert occurs only after awaited clipboard result that is not false. Rejection or false result gives Copy failed, never success. No Copy action when own identity is loading/unavailable; unavailable target identity is omitted. Full target profiles may copy their verified public ID too.

## 23. Edit Profile behavior

No Amira ID input or normal save payload was added. Existing editable name/bio/country/photo flow remains unchanged. Rules reject malicious identity insertion/change/deletion even if a modified client submits it. Existing UID console diagnostic is not a user-facing account number and remains separate from this batch.

## 24. Compact surfaces intentionally without ID

No additions to Home Host cards, Match compact presentation, Host Connect Consumer cards, Activity rows, Messages header, Story row or call overlay. No discovery/ranking, Level/VIP/Friends, financial or commercial coupling. Shared pure validation code does not import backend crypto/Firebase into the app.

## 25. Public projection/privacy implications

Only canonical verified string is added to permitted full-profile projections; existing target UID remains internal for navigation/backend operations. No reverse reservation document or metadata directory is exposed. Existing whitelist protects email/phone/wallet/totals/earnings/payout/raw DOB/verification/application data. Broad signed-in `users` reads are unchanged and remain a separate privacy project; this batch does not claim a public/private split. Own ensure exposes only current actor's public ID.

## 26. Search/lookup status

Deferred. No ID search, directory callable, Find by ID, direct messaging by ID, QR/share link/public route or identity lookup feature. Existing unrelated referral share link is unchanged, not an Amira ID feature.

## 27. Deletion/recycling status

No safe account-deletion lifecycle was found/added; client user deletion remains denied. Reservations are never deleted by this implementation, even if an account is removed/disabled through trusted external operations. Emulator confirms a removed local user does not free its number. No recycling/reclamation policy or deletion-law policy was invented. Trusted future deletion tooling must preserve reservations/tombstones to retain nonrecycling.

## 28. Exact tests added/updated

- New `amiraIdDomain.test.js`: 12 cases covering canonical endpoints, malformed forms and finite candidate bounds.
- New `amiraIdentity.test.js`: 8 cases covering ensured own identity, exact copy string, conflict/unavailable retry, stale account/loading response, three invalid target-ID cases, and clipboard rejection/false without success.
- New `amiraIdentityService.test.js`: 1 case verifying owner/seed/ID-free payload.
- Existing `callPaymentLifecycle.test.js`: 1 added callable auth/payload-forgery case; no old assertion removed.
- Existing `rewardsUi.test.js`: mock new identity adapter and add 2 own Consumer/Host profile display cases; prior assertions preserved.
- Existing `profileViewTrackingUi.test.js`: add canonical local full-profile fixtures/display assertions while preserving impression/load/dedup-path/Level assertions.
- New `amiraIdentity.emulator.cjs`: real transaction/race, partial/conflict, bounded retry, role permanence, target projections, direct identity/reservation/privacy denial, normal edits/protected fields and no recycling checks.

No old test depended on editable Amira ID behavior. Initial cold RN 5-second UI timeout was resolved by matching existing 30-second UI-suite timeout; final full validation passes.

## 29. Exact final Jest totals

**55 suites / 487 tests passed**, zero snapshots. Backend tests are included in these root totals; do not add standalone totals as distinct tests. Earlier full pass was 486 before adding clipboard-false coverage; final run includes that additional case.

## 30. Exact Functions totals

Standalone Functions: **10 suites / 238 tests passed**, zero snapshots. Includes identity format and actual exported callable security case while preserving all existing backend economics/call/Creator/rewards/social coverage.

## 31. Exact emulator/race results

| Local suite | Result |
| --- | --- |
| New Amira ID transaction/race/security | 58 checks passed |
| Creator role/earnings | 40 checks passed |
| Level/rewards | 53 checks passed |
| Consumer discovery/profile | 47 checks passed |
| Host Activity/profile views | 82 checks passed |
| Host Connect/availability/discovery | 68 checks passed |
| Social/messaging | 69 checks passed |
| Follow rules | Passed; suite does not print a numeric total |
| Rewards/economy rules | 32 checks passed |
| Call recovery transaction race | 9 assertions passed |

All use current rules on task-owned emulator `127.0.0.1:8289`, isolated demo namespaces. Existing social/follow/rewards scripts with hardcoded 8189 ran through an in-memory port/namespace adapter preserving their source assertions. Deterministic allocator injection is local trusted test setup; no production fixtures/seeds or remote calls. Task-owned emulator stopped after validation.

## 32. Static parse/diff checks

Babel parsed **224 JS/CJS files** in `src`, `functions/src`, `shared`. `git diff --check` passed. Final tracked/new code was manually reviewed after tests for UID display, editable/fake identity, role regeneration, unprotected writes/read directory, metadata/privacy leaks, ranking/coupling, production fixtures and unrelated/call changes. Searches confirmed intentional occurrences described above. Staged diff is empty.

## 33. Migration/backfill requirements

No production migration/backfill/index deployment performed or needed for this local implementation. Reverse UID lookup uses an automatic single-field Firestore index; no composite index file changed. Accounts lazily ensure after successful profile bootstrap (nonblocking) and on own-profile focus/retry. Existing listener receives the protected field update. Future authorized coordinated backend/rules/client release is needed before remote allocation works. Conflicting/malformed/missing-reservation mappings require separately authorized trusted repair; no repair administration tool/bulk migration was implemented.

## 34. Remaining limitations

Finite one-million-number namespace and bounded random allocation can fail under saturation/contention; no exhaustion counter or alternate version format. Only one-sided reservation recovery is supported; other inconsistencies fail closed. Lazy allocation is not a production backfill and offline/backend-unavailable accounts remain temporarily without displayed ID. Targets without authority omit it until their own ensure succeeds. No deletion/reclamation/search lifecycle. Broad user-read privacy remains separate. Physical clipboard/layout/auth-refresh behavior requires device validation. Existing quick login Account ID/referral code remains a distinct legacy naming/product concern, not public identity authority.

## 35. Future physical validation checklist

Pending, not performed:

1. After a later authorized deployment, create a real new account and verify one server-assigned canonical ID after bootstrap and unchanged on own-profile retry, relogin/reinstall/profile edit.
2. Verify own Consumer/Host profiles show ensured ID, Copy copies only that exact string, and device clipboard failures never show success.
3. Verify Consumer viewing Host and Host viewing Consumer full profiles show verified ID with normal Follow/Friends/message/block/Level behavior; compact surfaces remain uncluttered and do not show ID.
4. Verify pending/rejected/resubmitted/approved transitions preserve ID exactly, including permanent Host transition.
5. Test offline/error/loading and rapidly switching accounts: no cached prior-account ID, UID fallback, placeholder/random ID or blocked whole-app navigation.
6. Confirm malicious direct field/index mutation/read attempts fail under deployed rules later; malformed/conflicting fixtures require trusted repair rather than silently changing.
7. Verify no changes to Host availability/Busy, Activity/view privacy, call accounting/recovery, rates, earnings, rewards or deferred commercial/media systems.

## 36. No external mutation confirmation

No deploy, stage, commit, push, production Firebase mutation, billing or Storage activation. All identity fixtures/repair/deletion operations occurred only inside isolated local emulator tests. Working tree remains local and unstaged at `96c3fcf`; final status saved in `docs/amira-id-account-identity-git-status.txt`. No physical/deployed validation claimed.

## 37. Call recovery/accounting/economics unchanged

No call recovery/accounting/RTC/settlement/lock/timing/economics source was edited. Host rate/earnings, Level/rewards thresholds/economics, messaging entitlements and deferred VIP/payments/Gifts/Quick Match/invites/Stories/Moments/Storage systems remain unchanged. Existing call transaction and all checkpoint regressions passed. Stop condition respected; no Git publishing operation follows this report.
