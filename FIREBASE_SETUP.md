# Amira V2 Firebase setup

Batch 2 expects Firebase Auth, Firestore, and Firebase Storage in the existing Firebase project.

## Deployable rules

- Review and deploy `firestore.rules` and `storage.rules` from a trusted administrator environment.
- Administrative host approval requires a trusted backend/admin identity with the custom claim `admin: true`.
- Never grant that claim from the React Native application.
- Manual review must update both `hostApplications/{uid}.status` and the user's canonical `hostStatus`. Approval means `isApproved: true`, `verificationStatus: "approved"`, and an initial `availability: "offline"`; rejection must keep `isApproved: false` and use `rejected` or `needs_resubmission`.
- Test wallet top-ups are incompatible with the production Firestore rules because wallet mutations are intentionally server-only. Keep them disabled for production.

## Required Firestore indexes

Firebase may prompt for indexes for these collection queries:

- `users`: `role ASC`, `hostStatus.isApproved ASC`
- `users`: `role ASC`, `hostStatus.isApproved ASC`, `hostStatus.availability ASC`

Use the index-creation link emitted by Firestore or define the equivalent indexes before release.

## Storage and privacy

- Public host media lives below `users/{uid}/profile`, `gallery`, and `intro-video`.
- Verification evidence lives below `users/{uid}/verification` and is restricted to its owner and trusted administrators.
- The client validates basic type and size; Storage rules provide the authoritative enforcement.
- Add retention/deletion procedures for rejected applications and verification evidence before production.

## Local/EAS configuration

- Keep `google-services.json` local and ignored by Git.
- EAS builds should inject it through an EAS file secret and environment-aware Expo configuration.
- Firebase Storage must be enabled for the configured `storageBucket`.
- No Firebase service-account key or payment secret belongs in Expo environment variables.
