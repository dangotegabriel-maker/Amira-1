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

## Batch 5: Agora and trusted call backend setup

Standard Expo Go cannot load `react-native-agora`. Use an Android development build. No Agora
certificate, RTC token, Firebase auth token, or Paystack secret belongs in `.env` or client code.

### A–E. Create Agora configuration

1. Create an Agora account at https://console.agora.io and create an RTC project.
2. Copy its App ID. Add this public identifier to the app's local `.env`:
   `EXPO_PUBLIC_AGORA_APP_ID=your_app_id`.
3. Enable App Certificate/token security in the Agora project and copy the certificate privately.
4. Configure the same App ID as the Functions parameter when prompted during deployment, or in a
   local emulator parameter file. Never prefix the certificate with `EXPO_PUBLIC_`.
5. Store the certificate using Firebase Secret Manager:
   `firebase functions:secrets:set AGORA_APP_CERTIFICATE`.

### F–I. Install and deploy

```sh
cd functions
npm install
npm test
cd ..
firebase deploy --only functions
firebase deploy --only firestore:rules,firestore:indexes
npx expo prebuild --platform android
eas build --profile development --platform android
```

The Functions deployment prompts for the non-secret `AGORA_APP_ID` parameter. The certificate is
available only to `getVideoCallRtcCredentials`. For local emulator testing, start the Auth,
Firestore, and Functions emulators with `firebase emulators:start`; never point billing tests at a
production project.

### J–T. Two-device acceptance test

1. Install the development APK on two physical Android devices.
2. Sign in as a consumer on device 1 and an approved creator on device 2.
3. On device 2, open Creator Dashboard and select **Available for Calls**.
4. On device 1, tap the creator's video/rate affordance.
5. Verify device 2 shows the caller identity and Accept/Decline controls.
6. Accept and verify both local and remote video render before the call becomes connected.
7. Verify the consumer sees `FREE PREVIEW`, the authoritative rate, and the 30-second countdown.
8. At expiry, verify billing remains paused until **Continue** is tapped.
9. Verify 10-second ledger entries, wallet reduction, gross creator pending earnings, and no
   duplicate entries after retries. Platform commission is intentionally pending product policy.
10. End from each side and verify call history and restored creator availability.
11. Repeat with Decline and with no answer for 30 seconds; neither may consume preview or credits.
12. Call a second creator on the same UTC date and verify no second preview; repeat after the next
    UTC date and verify preview eligibility resets.

### Operational notes

- RTC tokens last 15 minutes and use random call-scoped channels and distinct numeric Agora UIDs.
- Firestore display timers are local; settlement is server-authoritative and idempotent by
  `callId_incrementNumber`. No Firestore writes occur every second.
- Ringing calls are reconciled every five minutes in bounded batches; their exact visible timeout
  is 30 seconds. A production operations pass should add alerting and a task-based stale-connected
  reconciliation path before large-scale launch.
- Connection authority currently requires both authenticated participants to report Agora's remote
  user event. A higher-assurance Agora server-side channel-presence verification can be added when
  the Agora REST credentials/product tier are selected.
- Firebase Storage remains disabled and is not required for calling.
