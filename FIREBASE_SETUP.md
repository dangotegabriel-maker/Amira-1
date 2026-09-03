# Amira V2 Firebase setup

Batch 2 expects Firebase Auth, Firestore, and Firebase Storage in the existing Firebase project.

## Batch 3 social collections

- `conversations/{deterministicUidPair}` and `conversations/{id}/messages/{messageId}` for participant-only direct text messaging.
- `users/{uid}/blocked/{blockedUid}` for bidirectional interaction checks without deleting history.
- `reports/{reportId}` for immutable user submissions and administrator review.
- `presence/{uid}` for conservative foreground state plus a freshness-limited `lastSeenAt`.
- `users/{uid}/profileViews/{viewerUid}` for cooldown-deduplicated profile views.
- `users/{uid}/notices/{noticeId}` for private system notices.
- `callHistory/{callId}` for future RTC call records; Batch 3 only reads/groups this model.

VIP is stored on the canonical user document under `vip`. The supplied rules prevent owner updates to that section; only trusted administrator/backend writes may grant or expire tiers.
Free consumers cannot read visitor identity documents directly. Their `profileViewStats.recentCount` is a backend-authoritative aggregate; until a trusted aggregator maintains it, the safe displayed count is zero. Approved hosts and active VIP consumers can read their own visitor identities.

## Deployable rules

- Review and deploy `firestore.rules` and `storage.rules` from a trusted administrator environment.
- Administrative host approval requires a trusted backend/admin identity with the custom claim `admin: true`.
- Never grant that claim from the React Native application.
- Manual review must update both `hostApplications/{uid}.status` and the user's canonical `hostStatus`. Approval means `isApproved: true`, `verificationStatus: "approved"`, and an initial `availability: "offline"`; rejection must keep `isApproved: false` and use `rejected` or `needs_resubmission`.
- On first approval, the trusted admin/backend should set `hostApprovedAt` to a server timestamp and retain it. The New feed uses that approval timestamp for its seven-day visibility window; legacy hosts without it remain eligible for For You but are not guessed to be new.
- Test wallet top-ups are incompatible with the production Firestore rules because wallet mutations are intentionally server-only. Keep them disabled for production.

## Required Firestore indexes

Firebase may prompt for indexes for these collection queries:

- `users`: `role ASC`, `hostStatus.isApproved ASC`
- `users`: `role ASC`, `hostStatus.isApproved ASC`, `hostStatus.availability ASC`
- `conversations`: `participantIds ARRAY_CONTAINS`, `lastMessageAt DESC`
- `callHistory`: `participantIds ARRAY_CONTAINS`, `createdAt DESC`

The Batch 3 indexes are deployable from `firestore.indexes.json`. Profile views, notices, and message subcollections use single-field ordering and normally use Firestore's automatic indexes.

Deploy both rules and indexes from a trusted Firebase CLI session before testing cross-device messaging. Existing deployed rules will not automatically change when these local files change.

Use the index-creation link emitted by Firestore or define the equivalent indexes before release.

## Storage and privacy

- Public host media lives below `users/{uid}/profile`, `gallery`, and `intro-video`.
- Verification evidence lives below `users/{uid}/verification` and is restricted to its owner and trusted administrators.
- The client validates basic type and size; Storage rules provide the authoritative enforcement.
- Add retention/deletion procedures for rejected applications and verification evidence before production.

## Local/EAS configuration

- Keep `google-services.json` local and ignored by Git.
- The currently local `google-services.json` is registered for Android package `com.amira.social`, while `app.json` declares `com.gabsads.amira`. Before producing a native Android/EAS build, register `com.gabsads.amira` as an Android app in Firebase Console and replace the local file with its matching download, or deliberately standardize the Expo package and Firebase registration on one identifier. Do not commit either file.
- EAS builds should inject it through an EAS file secret and environment-aware Expo configuration.
- Firebase Storage must be enabled for the configured `storageBucket`.
- Deploy `storage.rules` after enabling Storage; the client cannot deploy or verify the active production ruleset.
- Storage is intentionally not required by Batch 3. Media operations remain disabled unless `EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS=true`; the host application does not fake successful media completion while disabled.
- No Firebase service-account key or payment secret belongs in Expo environment variables.
# Batch 4 video-call foundation

Amira now has a Firestore call-request model (`calls/{callId}`), centralized lifecycle validation,
UTC daily-preview entitlement design, 10-second billing quotes, and integration with the existing
`callHistory` read model. Deploy the changed policy with:

```sh
firebase deploy --only firestore:rules,firestore:indexes
```

Production video is intentionally disabled until an RTC provider is selected. A trusted backend
must mint short-lived RTC tokens, validate authoritative creator pricing and block state, enforce
one active call per participant transactionally, change `accepted -> connecting -> connected`,
atomically consume `users/{uid}/entitlements/dailyPreview` on the first confirmed RTC connection,
settle 10-second credit increments, stop settlement on disconnect, and write immutable call history.
Provider secrets and wallet mutation must never be placed in the Expo client.

For local UX testing only, set `EXPO_PUBLIC_ENABLE_CALL_SIMULATOR=true` in a development build.
The simulator cannot run when `__DEV__` is false, does not contact demo UIDs, does not mutate wallets,
and does not write fake settlements. UTC (`YYYY-MM-DD`) is the daily-preview calendar policy.
