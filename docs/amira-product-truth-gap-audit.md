# Amira Product-Truth Gap Audit — Checkpoint 21

## 1. Executive audit summary

Amira has coherent repository foundations for account/role bootstrap, safe public identity, Consumer/Host navigation, discovery, social relationships, profile views, Credits, rewards, VIP entitlement, paid messaging, Quick Match, sponsored calls, connected-time call accounting, Gifts, and Agora authorization. It is not production-complete. Recent callable/rules work is not deployed because Firebase billing is unavailable; commercial configuration is intentionally absent; Storage, payment checkout, translation, push, content creation, referral accounting, and several Host earning sources remain incomplete or blocked.

The most serious product-truth defects are routed mock Moments/Stories content, a mock translation service, inert Settings rows, a synthetic Invite & Earn code/link without tracking, and stale local gifting/socket utilities. These must not be represented as production features. No new security/privacy regression was found in current rules or emulator coverage.

## 2. Baseline and repository state

Audit began on branch `amira-v2`, exact HEAD `fec9cb0260f5451a279eff64c6534f2efe1a54f0` (`feat: add authoritative live call gifts`), with an empty working tree. This checkpoint changes only this report and its Git-status companion. It does not establish deployed behavior.

## 3. Audit methodology

Evidence came from current screens/components, client services, Cloud Functions, Firestore and Storage rules, indexes, tests, all reports under `docs/`, repository-wide searches for local/mock/placeholder authority, and fresh Jest/emulator/static validation. A previous report was corroboration, never sole proof. Repository implementation, localhost testability, and deployed production behavior are kept separate.

## 4. Status definitions

`COMPLETE` means the intended repository architecture exists end-to-end, apart from explicitly named deployment/configuration limitations. `PARTIAL` means meaningful pieces exist but intended behavior remains. `MISSING` means no meaningful implementation or only fake/placeholder UI. `BLOCKED` means a required external service, deployment, or approved value prevents responsible completion. `DEFERRED` means explicitly postponed or outside current scope.

## 5. Checkpoint ledger 1–20

| CP | Purpose / documented baseline | Current evidence | Regression evidence | Deferred/blocked |
|---|---|---|---|---|
| 1 | Early app/product cleanup (`BATCH_1_3_REPORT.md`, `e3351a9`) | Core screens and social service remain | Root Jest | Later authoritative replacements supersede some early paths |
| 2 | Consumer Rewards cleanup | Rewards/Level screens and domains remain | reward/level Jest + emulator | Production values absent |
| 3 | Call recovery foundation | Recovery Functions/services remain | recovery unit/rules/emulator | deployment |
| 4 | Creator role integrity (`da07a5d`) | permanent approved Host transition remains | role emulator/UI tests | Storage blocks submission |
| 5 | Host Activity/profile views (`76ccf3a`) | direction-aware views and Activity tabs remain | Activity emulator/UI | pagination, Calls detail |
| 6 | Host Connect (`6b95d68`) | safe Consumer projections and availability remain | Connect emulator/UI | Add Story |
| 7 | Amira ID (`96c3fcf`) | allocator/reservation/public projection remain | 58-check identity suite | search intentionally absent |
| 8 | Privacy boundary (`1ba2799`) | raw cross-user reads denied; projections/callables used | 79-check privacy suite | deployment |
| 9 | Credits/recharge (`7d49eb8`) | P/B/L/U wallet, ledger, verification/reversal remain | credit Jest/emulator | provider/packages/deployment |
| 10 | Paid messaging (`4cec0dd`) | entitlement/debit/refund foundation remains | paid-message Jest/emulator | economics; closed-app scheduler |
| 11 | Gifts/Host earnings (`fe112c8`) | authoritative Gift transaction graph remains | Gift Jest/emulator | catalogue/economics, some UI sources |
| 12 | VIP (`c869512`) | FREE/VIP fixed windows, purchase proof, access checks remain | VIP Jest/emulator | plans/payment/deployment |
| 13 | Quick Match (`42dc875`) | reserve/offer/commit/call lifecycle remains | Quick Match Jest/emulator | price/config/deployment |
| 14 | automatic call billing (`7a044a1`) | FVT/10-second paid/recovery remain | call Jest/race/emulator | economics/deployment/physical retest |
| 15 | sponsored invites (`8ddfb12`) | invite/accept/30-sec/FVT/paid foundation remains | sponsored emulator/UI | push and story-viewer source |
| 16 | Who Viewed Me (`896b29e`) | FREE redaction and VIP reveal remain | VIP/privacy emulator | bounded history |
| 17 | Consumer reward tasks (`042aa85`) | configured tasks/evidence/claims remain | reward Jest/emulator | production task config |
| 18 | social integrity (`a103341`) | mutual follow, friendship event, block cleanup remain | 71-check social suite | pagination/notifications |
| 19 | incoming identity (`aba3b33`) | safe incoming identity, Level/VIP remain | privacy/call UI tests | deployed backend unknown/not recent |
| 20 | live call Gifts (`fec9cb0`) | connected-call validation and unified tray remain | Gift/call Jest/emulator | Host live animation; deployment/config |

## 6. Master feature matrix

The matrix contains **82 independently classified items**. Counts are: **COMPLETE 44, PARTIAL 18, MISSING 8, BLOCKED 10, DEFERRED 2**.

| Domain | Feature | Status | Repository evidence | Backend authority | UI status | Production config | Deployment | Known limitation / next dependency |
|---|---|---|---|---|---|---|---|---|
| Navigation | Consumer tabs | COMPLETE | `MainTabNavigator` | profile role | exact four tabs | n/a | client release unknown | none found |
| Navigation | Host tabs/permanent transition | COMPLETE | navigator + user model | protected approval | exact four tabs | n/a | recent backend unknown | no mode switch |
| Auth | Auth persistence/bootstrap | COMPLETE | `UserContext`, Firebase Auth | Auth + owned profile | bootstrap routing | Firebase config exists | existing | malformed fallback is sparse |
| Auth | Quick Login safety | COMPLETE | `DEV_FEATURES.enableQuickLogin` | development build only | hidden outside dev | n/a | client release unknown | demo host flag defaults on in dev |
| Discovery | Real approved Hosts | COMPLETE | discovery callable/service | server projection | Home grids | n/a | recent backend NOT DEPLOYED | no demo fallback in product query |
| Discovery | For You/New/Following | COMPLETE | Home/discovery/follow services | server + relationship docs | exact tabs | n/a | recent backend NOT DEPLOYED | bounded lists |
| Discovery | Filters/persistence | PARTIAL | filters hook/modal | eligible pool server, filtering partly client | all five controls | n/a | mixed | AsyncStorage preference and bounded candidate pool |
| Discovery | Ranking | PARTIAL | discovery domain | server ranking | implicit | n/a | NOT DEPLOYED | limited pool/no pagination |
| Discovery | Not Interested | PARTIAL | moderation preference paths | persisted | Host profile menu | n/a | unknown | full cross-surface effect needs validation |
| Match | Normal Match | COMPLETE | `MatchScreen`, discovery service | approved pool | one-at-time/next/actions | n/a | mixed | bounded session pool |
| Match | Photo rotation | COMPLETE | rotation hook/HostCard | safe gallery projection | ~3 seconds | Storage limits inventory | client | display only |
| Quick Match | Reserve/offer/commit | COMPLETE | Functions domains/service | authoritative transaction | search/offer/call | config absent | NOT DEPLOYED | unusable commercially until configured |
| Quick Match | Entitlement/purchased fallback | BLOCKED | hooks exist | config-driven | truthful unavailable | price/economics absent | NOT DEPLOYED | approved economics |
| Profile | Consumer profile shell | COMPLETE | `MyProfileScreen` | owned profile/callables | required destinations | mixed | client | some destinations incomplete |
| Profile | Edit restrictions | PARTIAL | edit/onboarding screens | rules protect sensitive fields | editing exists | n/a | mixed | phone/account UI incomplete |
| Profile | Public Host profile | COMPLETE | `UserProfileScreen`, projection callable | safe identity/social callables | identity/counts/actions/media | n/a | recent backend NOT DEPLOYED | media inventory limited |
| Identity | Amira ID | COMPLETE | allocator/service/rules | server unique reservation | copy surfaces | n/a | NOT DEPLOYED | no search by design |
| Social | Consumer→Host follow | COMPLETE | follow service/Functions | transaction + rules | profile/following | n/a | mixed | bounded list |
| Social | Host→Consumer follow/friends | COMPLETE | social Functions | authoritative mutual state | full profile/activity | n/a | NOT DEPLOYED | no compact badge by design |
| Social | Like/unlike/counts | COMPLETE | social backend | transaction/projection | Host profile | n/a | NOT DEPLOYED | bounded activity |
| Social | Block cleanup | COMPLETE | block/follow Functions | bidirectional cleanup | Block/List actions | n/a | NOT DEPLOYED | historical messages stay readable |
| Views | Consumer→Host Activity | COMPLETE | profile view callable | 30-min server dedup | Visitors tab | n/a | NOT DEPLOYED | bounded |
| Views | Host→Consumer Who Viewed Me | COMPLETE | profile views/VIP | redacted/revealed callable | locked/VIP states | VIP plans absent | NOT DEPLOYED | bounded history |
| Host Connect | Consumer discovery | COMPLETE | Host Connect callable | safe projection | two-column For You/Following | n/a | NOT DEPLOYED | bounded |
| Host Connect | Add Story | BLOCKED | disabled CTA only | none | “Coming later” | Storage disabled | NOT DEPLOYED | content backend + Storage |
| Activity | Visitors/Likes/Followers/Gifts | COMPLETE | Activity callable/projections | server filtered | tabs/actions/empty states | n/a | NOT DEPLOYED | bounded/no pagination |
| Activity | Calls tab | PARTIAL | call history service | backend history | summary rows | n/a | NOT DEPLOYED | exact duration presentation/actions incomplete |
| Availability | online/offline/busy/restore | COMPLETE | host/call Functions | server locks/status | switch and busy state | n/a | NOT DEPLOYED | stale recovery scheduler/deploy |
| Calls | Normal entry/incoming | COMPLETE | call services/public identity | preflight + locks | all entry points/incoming card | rates needed per Host | recent backend NOT DEPLOYED | physical retest needed |
| Calls | Agora RTC/token boundary | COMPLETE | rtc service + secret callable | participant token authorization | video/mute/camera/end | App ID/certificate required | mixed/UNKNOWN | certificate must remain server-only |
| Calls | FVT/automatic paid/reconnect | COMPLETE | call payment/recovery | server connected time/10-sec increments | disclosure/status | economics hooks | NOT DEPLOYED | physical retest |
| Calls | Chat/Gift controls | COMPLETE | VideoCallScreen | normal services/call Gift validation | connected-only | Gift config absent | NOT DEPLOYED | Host Gift animation deferred |
| Sponsored | Invite lifecycle | COMPLETE | sponsored service/domain | authoritative invite/call | accept/not now | rate hooks | NOT DEPLOYED | no push |
| Sponsored | All intended sources | PARTIAL | profile/messages/activity wired | source allowlist | most sources | n/a | NOT DEPLOYED | Story viewer source absent |
| History | Consumer/Host history | PARTIAL | `callHistoryService` limit 200 | trusted finalization | Messages Calls/Activity | n/a | NOT DEPLOYED | no pagination; presentation differs from locked line |
| Gifts | Catalogue/economics | BLOCKED | config parser/service | server-only config | unavailable state | no approved catalogue/share | NOT DEPLOYED | approved values |
| Gifts | Purchased-only transaction | COMPLETE | Gift Function/domain | P/B/L/U transaction/idempotency | unified tray | catalogue absent | NOT DEPLOYED | config required for use |
| Gifts | Profile/Messages/Call entry | COMPLETE | GiftTray integrations | sender/recipient/call validation | present | catalogue absent | NOT DEPLOYED | Story/Moment absent |
| Gifts | Story/Moment Gift | MISSING | no authoritative content integration | none | absent | Storage/content absent | NOT DEPLOYED | content architecture |
| Gifts | Host live acknowledgement | DEFERRED | persistent message/activity only | durable artifacts | no live Host animation | n/a | NOT DEPLOYED | safe realtime Gift channel |
| Wallet | P/B/L/U invariant/ledger | COMPLETE | credit domain/service | server transaction | wallet/history | packages absent | NOT DEPLOYED | production migration/deploy |
| Wallet | Reversal/Level linkage | COMPLETE | verification/reversal | provider proof + transaction | history | provider absent | NOT DEPLOYED | Paystack adapter/config |
| Recharge | Packages/attempt foundation | PARTIAL | credit service/UI | server config/attempt | Recharge shell | packages absent | NOT DEPLOYED | approved packages |
| Recharge | Checkout/provider verification | BLOCKED | provider interface, unavailable UI | server-only intended | no checkout | Paystack/deployment absent | NOT DEPLOYED | secret rotation, adapter, billing |
| Messaging | Text/conversations/read receipts | COMPLETE | messaging service/Functions | authoritative send/access | list/detail | n/a | mixed | bounded subscriptions |
| Messaging | Paid 24h/refund | COMPLETE | entitlements/social Functions | server debit/refund | access/recharge states | price absent | NOT DEPLOYED | scheduler for closed-app refund |
| Messaging | Photo messages | BLOCKED | no complete message type pipeline | none complete | no composer | Storage disabled | NOT DEPLOYED | Storage + rules/service/UI |
| Translation | Automatic translation | MISSING | local mock prefix/cache only | none | not integrated truthfully | provider unselected | NOT DEPLOYED | provider + server/privacy design |
| VIP | FREE/VIP fixed membership | COMPLETE | VIP domains/service/rules | server proof/window | store/state | plans absent | NOT DEPLOYED | approved plan config/payment |
| VIP | Purchase checkout | BLOCKED | attempt/verify foundation | server intended | checkout unavailable | prices/provider absent | NOT DEPLOYED | plans, provider, deploy |
| VIP | Who Viewed Me access | COMPLETE | view callable | server expiry check | lock/reveal | membership unavailable | NOT DEPLOYED | live plan |
| VIP | VIP Host Content | PARTIAL | access callable + metadata concept | server access check | no complete content flow | Storage absent | NOT DEPLOYED | Stories/Moments creation |
| VIP | Discounts/rewards hooks | BLOCKED | policy references exist | config-driven | described as future | values absent | NOT DEPLOYED | approved policies |
| Level | lifetime verified-purchase Level | COMPLETE | level/credit domains | protected qualifying total/reversal | My Level/incoming/full profile | thresholds absent | NOT DEPLOYED | real users remain Level 0 |
| Level | milestone benefits | BLOCKED | config parser/claims | server config | locked/unavailable | thresholds/rewards absent | NOT DEPLOYED | approved config |
| Rewards | daily check-in | COMPLETE | reward Functions | server UTC streak/claim | dashboard | fallback/config model | NOT DEPLOYED | production config review |
| Rewards | Getting Started/Daily tasks | COMPLETE | task/evidence domains | server evidence/claims | sections/states | production tasks absent | NOT DEPLOYED | task config |
| Rewards | Weekly/Milestones | DEFERRED | intentionally excluded | none | absent | n/a | n/a | future scope |
| Stories | discovery-row read | PARTIAL | host projection/story viewer | limited existing fields | row/viewer | no creation backend | mixed | stale/external data only |
| Stories | creation/manage/stats/actions | BLOCKED | disabled Add Story | none | viewer lacks actions | Storage disabled | NOT DEPLOYED | full content model/moderation |
| Moments | Consumer feed | MISSING | routed hardcoded `mockPosts` | none | fake Unsplash feed | n/a | client | remove/replace with real backend |
| Moments | Host create/manage | MISSING | no service/authority | none | absent | Storage disabled | NOT DEPLOYED | Story/content foundation |
| Media | Host photo display | COMPLETE | safe public gallery/rotation | projection | cards/profile | existing URLs only | mixed | no management |
| Media | Upload/reorder/delete | BLOCKED | gated media service | Storage rules exist | Creator uploads disabled | Storage billing disabled | NOT DEPLOYED | enable/deploy Storage safely |
| Creator | application workflow | PARTIAL | seven-step UI/service/rules | owned draft/protected approval | truthful disabled media/submit | Storage disabled | NOT DEPLOYED | uploads + manual ops |
| Host profile | Own account separation | COMPLETE | role navigation/profile tests | role-derived | hides Credits/Rewards/WVM; Earnings | n/a | client | Invite & Earn wording issue |
| Earnings | Gift/call pending equivalent | COMPLETE | Host earnings doc/service | server accounting | pending-equivalent UI | economics config | NOT DEPLOYED | explicitly non-cash |
| Earnings | Available/Lifetime/payout | MISSING | no payout ledger/process | none | no truthful balances | payout economics absent | NOT DEPLOYED | payout/compliance design |
| Earnings | Referral/VIP conversion/renewal | PARTIAL | source fields/attribution references | no approved calculation | not broken out | formulas absent | NOT DEPLOYED | economics + provider events |
| Referral | Invite & Earn | MISSING | synthetic UID-derived code/link | no tracking/qualification | share/copy overclaims verification | economics absent | client | authoritative referral system |
| Settings | Logout/block list | PARTIAL | logout works; BlockedUsers route elsewhere | Auth/block backend | logout works | n/a | mixed | Settings Block List row itself inert |
| Settings | language/privacy/account controls | MISSING | inert rows; no preferred-language setting | none | misleading tappable rows | provider/requirements absent | client | implement truthful settings |
| Moderation | Report | COMPLETE | report service/rules | create + admin read | profile/chat/call | moderation ops external | mixed | no user status tracking |
| Moderation | Block | COMPLETE | block service/Functions | authoritative consequences | several surfaces | n/a | NOT DEPLOYED | verify deployed parity |
| Notifications | in-app notices/system events | PARTIAL | notice UI + friendship message | Firestore artifacts | Notices tab | n/a | mixed | event coverage limited |
| Notifications | push delivery/preferences | MISSING | no token/provider pipeline | none | no real preferences | provider unselected | NOT DEPLOYED | provider + permission/opt-outs |
| Privacy | raw-user boundary | COMPLETE | rules/projections | deny cross-user raw reads | safe identity loading | n/a | NOT DEPLOYED | deploy current rules/functions |
| Rules | financial/role/VIP/Level protection | COMPLETE | `firestore.rules` deny client writes | admin/callables only | n/a | n/a | NOT DEPLOYED | deployed parity unknown |
| Secrets | client/server boundary | PARTIAL | Functions secrets for Agora; public Firebase config | server certificate | n/a | local ignored Paystack-like secret | mixed | rotate before production; history inconclusive |
| Indexes | current composite indexes | PARTIAL | calls/history/invites/users indexes | n/a | n/a | deploy required | NOT DEPLOYED | query drift risk; no automated index completeness proof |
| Demo | demo Hosts | PARTIAL | `demoHosts.js`, dev-only flag | excluded by server eligibility | dev only | disable explicitly in release | client | stale production bundle code |
| Local authority | AsyncStorage | PARTIAL | filters/preferences/translation cache/logout clear | no core economic authority found | local preferences | n/a | client | mock translation cache and broad clear |

## 7. Navigation/account bootstrap

Startup is Auth/profile bootstrap to Consumer Home by default. There is no startup role chooser. Pending applicants remain Consumers; approved Hosts receive Connect, Messages, Activity, Profile with no mode switch. Gender is separate from role. The unused `RoleSelectionScreen` is stale. Profile hydration falls back to a sparse auth-derived object when profile bootstrap fails; routing then requests missing onboarding fields rather than granting authority.

## 8. Consumer Home/discovery

Home uses real approved Host projections with For You/New/Following and two-column cards. New uses approval recency near 14 days; cards omit age/interests/tier/Like and show name, flag, status, rate, call action. Stories appear only from projected active-story data, but the broader story subsystem is incomplete. Filters cover country/language/age/online/interests and persist locally; application over a bounded candidate set limits completeness. No spend/VIP/Level advantage was found.

## 9. Match

Normal Match uses the same filtered approved pool, presents one Host, prioritizes Online and falls back Offline, avoids repeats until cycling, rotates multiple photos, and offers Message/Video. It remains bounded by the fetched pool. Block and hidden preference filtering are represented; no fake Host fallback is used by the production discovery service.

## 10. Quick Match

The repository has entitlement-first/configured purchased fallback, a single active request, sequential offers, explicit Host acceptance, reserve/commit semantics, hidden Host during search, intro/FVT/paid continuation, shared call UI, Chat/Gift, locks, recovery, and no auto-follow. It is commercially unusable because price/economics are absent and recent backend is not deployed.

## 11. Consumer Profile

Photo/name/flag/Amira ID/copy/edit, Credits/Recharge/history, VIP, Who Viewed Me, Following, Invite & Earn, Settings, Creator Application, My Level and Rewards are surfaced. Bio support exists; Interests are not shown on Consumer own profile. DOB/country protection is rules/model driven. Invite & Earn is not real, and several Settings rows are inert.

## 12. Host Profile

The public profile uses safe identity projections and authoritative Follow/Like/Friends/counts, About, interests, availability/rate/Amira ID, media display, Moments/Gifts sections, sticky actions, and Report/Block/Not Interested without Share. Counts are non-tappable and no fake verification/count fallback was found. Content/media management remains incomplete.

## 13. Social relationships

Consumer→Host and Host→Consumer follows, mutual friendship, unfollow, Like/unlike, block cleanup and friendship system messages are authoritative. No friend request exists. Friends is kept off conversation headers and compact cards. Follow/unfollow push delivery does not exist.

## 14. Profile views/Who Viewed Me

Directions are separate: Consumer opening Host produces Host Activity; Host opening Consumer produces Consumer Who Viewed Me. Server time and ~30-minute dedup apply; blocks filter; Gift/call operations do not fabricate views. FREE receives count-only bounded metadata; active VIP receives safe identities/time/repeat count. Expiry relocks without deletion. History is bounded without pagination.

## 15. Host Connect

Availability switch, Busy protection, compact Today metrics, real Consumer discovery, For You/Following, two-column cards and role-safe projections exist. Compact cards omit VIP/Level. Add Story is a truthful disabled CTA; Profile Visitors correctly belongs to Activity.

## 16. Host Activity

All, Visitors, Likes, Followers, Gifts and Calls tabs exist. Visitors/Likes/Gifts provide appropriate Message/Invite/Thank actions backed by server-filtered records. Empty/error states exist. Queries are bounded. Calls uses real call history but lacks the fully locked simple duration presentation and pagination.

## 17. Availability

Host Online/Offline/Busy, pre-call availability restoration, eligibility checks, active locks, timeout/recovery and call-end cleanup exist in Functions. Current production parity is unknown and recent code is not deployed.

## 18. Normal Video Calls

Home/Profile/Match/Messages entry points converge on authoritative preflight and locks. Incoming identity uses safe projections and shows Level/VIP with accept/decline/timeout. Connected UI has RTC, mute, camera, Chat, Consumer Gift, End and safety/report. FVT, automatic 10-second paid increments, discount hooks, no-debt end, Host pending earnings, reconnect and genuine connected-time accounting exist. Remaining gaps are deployment, approved economics, final presentation/history details, and physical retesting of recent changes.

## 19. Sponsored Calls

Host invitations work from Consumer profile, Messages and most Activity sources; accept/not-now, 30 sponsored connected seconds, FVT then paid, zero Host earnings during sponsored time, anti-spam and Busy checks exist. Story-viewer invitation is absent, and push delivery is missing.

## 20. Call History

Trusted finalization and participant-only reads exist. Consumer Messages Calls and Host Activity Calls use the history. The intended `Video call · 3:42 · 18m ago` presentation is not consistently implemented, and the query is limited to 200 without pagination.

## 21. Gifts

Server config owns catalogue, price and allocation; none are invented. Only purchased provenance is eligible, idempotent server transactions write wallet/ledger, Gift record, Host pending-equivalent earning, platform accounting, public aggregate and persistent message. Profile, Messages and active Consumer→Host calls reuse GiftTray. Blocks, roles, call context, Level and VIP independence are enforced. Story/Moment entry and Host live animation are absent/deferred; sender ranking UI is truthfully unavailable.

## 22. Credits/Wallet

Canonical wallet uses `purchasedCredits`, `bonusCredits`, `legacyCredits`, `unallocatedSpentCredits` and `totalBalance`, with server transactions and ledger/history. Purchase verification, provider-reference uniqueness, reversal, lifetime Level qualifying reversal, Gift eligibility, messaging and call spend paths are tested. Production migration/config/deployment remain required.

## 23. Recharge

Recharge and transaction history UI exist with config-driven packages/attempt architecture and server-only verification interfaces. Checkout is truthfully unavailable. Paystack must be configured server-side, its secret rotated, packages approved, backend deployed, and UI connected before real use.

## 24. Messaging

Conversation list/detail, text, read receipts, persistent Gift/system events, call and Gift entries, block behavior, access-expiry copy and historical readability exist. Header does not add VIP/Level/Friends. Photo and translation paths are absent/incomplete. Lists/subscriptions are bounded.

## 25. Paid Messaging

Priority is Friends → active 24h → Free Message → paid 24h → insufficient/Recharge. Host→Consumer is free and does not grant Consumer reply entitlement. One Free Message is Host-specific; paid unlock is server-priced/debited; qualifying Host text reply and refund rules exclude Gift/system/call events. Price config is absent. Automatic refund while both apps remain closed requires a scheduler/deployed trigger.

## 26. Translation

Status is MISSING. `translationService.js` generates `[language] text` and two canned substitutions, delays locally, and caches in AsyncStorage. It is neither a provider-independent authoritative architecture nor integrated automatic translation with preserved original/subtle label. It is dangerous if exposed as real translation and should stay unused until provider/privacy/error semantics are designed.

## 27. Photo Messaging

Status is BLOCKED. Consumer VIP and Host-entitlement concepts exist elsewhere, but no complete photo message schema, upload flow, composer, access enforcement, or historical rendering exists. Storage is disabled.

## 28. VIP

Exactly FREE/VIP and fixed 3/7/30-day definitions exist; active membership cannot extend and auto-renew is absent. Server proof, expiry and content access foundations exist. Who Viewed Me works in repository. Host content, photo messaging, discounts and rewards depend on incomplete features/config. No unlimited messaging, hidden pool, discovery advantage, automatic VIP, Gift discount, or VIP-exclusive Gifts was found.

## 29. Amira Level

Consumer-only Level 0–10 derives solely from lifetime qualifying verified purchased Credits; bonus/reward/spend/inactivity do not advance it and reversals reduce it. My Level and approved Host full/incoming surfaces exist; compact Connect cards omit it. Thresholds/milestones are config-driven and absent, so real users remain truthful Level 0.

## 30. Consumer Rewards

Daily Check-In, Getting Started and Daily Tasks use server evidence/idempotent claims; Promotional Gifts are excluded. Free Messages/FVT integration exists. Production task/reward configuration needs approval. Weekly challenges and broader milestones are deferred.

## 31. Stories

Discovery can read projected active stories and StoryViewer can display passed image/video URLs. Creation, exact expiry authority, privacy, reactions/replies/Gifts, viewer management/stats/save/delete, and Story-viewer sponsored action are not complete. Add Story is disabled. Storage is a blocker.

## 32. Moments

The routed `MomentsScreen` is a production fake: it creates named Unsplash `mockPosts` and stories in a local effect. No Story→Moment conversion, persistence, visibility, pin/reorder, stats, management, or authoritative engagement exists. This is MISSING and should be hidden or replaced in a future checkpoint.

## 33. Media

Existing public profile/gallery URLs display and rotate; full profile supports gallery presentation. `mediaService` validates owned paths/types/sizes and Storage rules exist, but uploads are gated by `EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS === 'true'`. Reorder/main-photo management and content media are incomplete. Storage must remain disabled until billing/rules/moderation are ready.

## 34. Creator Application

The seven intended steps exist in order with draft service/rules, private verification semantics, payout step and review. Pending remains Consumer and trusted approval permanently changes role. Media-required submission is truthfully disabled while Storage is unavailable; no placeholders are saved.

## 35. Host Own Profile

Approved Hosts do not receive Consumer Wallet, Recharge, Rewards, Who Viewed Me or My Level routes. They receive Earnings and creator-facing profile behavior, with no mode switch. The shared Invite & Earn link remains misleading because referrals are not authoritative.

## 36. Host Earnings

Video Call and Gift pending Credits-equivalent accounting is real in repository and UI explicitly avoids withdrawable-cash claims. Available, Lifetime and payout are absent. Referral/VIP conversion/renewal source concepts are not economically complete.

## 37. VIP Conversion

VIP purchase attempts can carry validated Story/Moment attribution and record first/later classification. `conversionEarningCreated` remains false and no approved conversion/renewal formula creates earnings. Attribution is PARTIAL; earning is BLOCKED by economics/content/payment.

## 38. Referral/Invite & Earn

The UI derives a code from UID when no code exists and shares an `amira.app` link, while claiming qualification is verified. No referral ingestion, attribution, qualification, anti-abuse, ledger or economics was found. This is a production wording/backend mismatch and MISSING.

## 39. Settings

Logout is functional. `Update Phone Number`, `Email & Password`, `Block List`, and `Invisible Mode` render as tappable rows without handlers. The actual Blocked Users route exists elsewhere. Preferred language and notification controls are absent. Imported AsyncStorage is unused in this screen.

## 40. Report/Block/Not Interested

Reports persist for admin review from profile/chat/call surfaces. Block has broad authoritative consequences across social, profile views, Gifts, calls, Quick Match and sponsored invites while preserving historical messages. Not Interested is persisted and applied in discovery paths but its complete cross-surface behavior deserves a focused test ledger.

## 41. Notifications

Notices and system conversation events are in-app artifacts. No push token registration, provider delivery, permission flow or notification preferences were found. Sponsored-call push is absent; Follow does not prove a delivered notification; unfollow remains silent.

## 42. Privacy

Checkpoint 8 remains intact in current rules/tests: raw cross-user `users/{uid}` reads are denied; safe projection callables are used; wallet, qualifying total, VIP payments, earnings, calls, Gifts and Who Viewed Me are protected. No later privacy regression was found.

## 43. Firestore Rules

Rules deny client financial, Gift, VIP, Level, Quick Match, invite, earnings and billing mutations; Host application approval/role-sensitive fields are protected; conversations/calls/history are participant-readable. Public presence and Host reputation reads are intentionally broad to signed-in users. Current rules need deployment; deployed parity was not queried. No broad raw-private-profile read was found.

## 44. Secret Hygiene

`.env` is ignored and `.env.example` contains public placeholders while explicitly excluding the Agora certificate. Agora certificate uses a Functions secret; App ID is public/configured. Firebase client config is correctly public, though fallbacks are embedded. A local ignored `.env` reportedly contains a Paystack-secret-like value; its value was not printed. Rotation is required before production, and historical exposure cannot be conclusively excluded by this audit.

## 45. Storage

The exact gate is `EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS === 'true'`. No fake upload succeeds when disabled. Blocked/limited areas: Creator Application profile/gallery/intro/verification, Host photo management, Stories, Moments, VIP content and photo messaging. Existing remote URLs can still display.

## 46. Paystack

Client UI does not read a secret or verify payments authoritatively. Functions define provider-proof boundaries but no live adapter/checkout is enabled. Before recharge/VIP: rotate secret, configure Functions secret/provider, approve packages/plans/currency, deploy billing-enabled Functions/rules/indexes, connect checkout, test webhooks/reversal/idempotency, and physically validate. No provider call occurred.

## 47. Agora

Client App ID is public; certificate remains a Functions secret. Participant-only token callable, channel/UID sanitization, join/remote-presence evidence, epochs/reconnect and one-call locks exist. Historical physical evidence covers a real two-phone normal call, video, controls, FVT, rate/end and released locks; CP13–20 paths still need physical validation after deployment.

## 48. Demo/placeholder audit

Dangerous: routed Moments fake people/content; mock translation; synthetic referral code/link with verification wording; inert Settings rows. Development-only: Quick Login, call simulator and demo Host fixtures/flag. Truthful unavailable: Recharge, VIP checkout, Gift catalogue, phone login, Add Story and Creator media. Harmless: test fixtures/demo emulator project IDs. Stale candidates: `RoleSelectionScreen`, legacy `giftingService`, `GiftingContext`, `socketService` incoming handler, withdrawal/payment shells and `demoHosts.js` outside development usage.

## 49. AsyncStorage authority audit

Uses include discovery filter/UI preferences, translation cache and broad clearing during force logout; Settings imports it without use. No authoritative Credits, VIP, Level, Gift, relationship, block, payment verification or Host approval was found stored only in AsyncStorage. The mock translation cache is non-authoritative but misleading; `AsyncStorage.clear()` is broader than necessary.

## 50. Client trust audit

Financial values, Gift price/share, call rates/economics, paid-message policy, Quick Match terms, VIP plans, Level and reward claims are revalidated/snapshotted server-side. Role/approval and earnings cannot be client-written. Blocks/friendship use Functions/rules. Client call signals carry sequence/evidence rather than trusted duration. No direct client authority regression was found.

## 51. UI/backend mismatch table

| Type | Finding | Truth |
|---|---|---|
| UI exists/backend missing | Moments feed | hardcoded fake content; no persistence |
| UI exists/backend missing | Invite & Earn | share-only synthetic code; no referral tracking |
| UI exists/backend missing | Settings account/privacy rows | inert controls |
| Code exists/not real backend | translation service | local mock, no provider or message integration |
| Backend exists/UI incomplete | VIP attribution | records attribution; no earning/admin/content completion |
| Backend exists/UI incomplete | Call history | records exist; exact presentation/pagination incomplete |
| Backend exists/UI missing | public Gift sender aggregates/ranking | leaderboard truthfully unavailable |
| Backend complete/config absent | Gifts, paid messaging, Quick Match, VIP, Level | server foundations fail closed without approved config |
| Feature unavailable | Recharge/payment | truthful unavailable UI; provider not called |
| Feature unavailable | media/Creator submission/Add Story | truthful Storage gate |
| UI wording overclaims | Invite & Earn qualification | no verifier exists |
| UI wording is appropriately cautious | Host earnings | pending Credits-equivalent, not cash |

## 52. Empty/error/offline states

Home, Match, Who Viewed Me, Rewards, Level, Connect, Activity, Gift Tray, Recharge/VIP and calls generally show loading/empty/retry/unavailable states. Chat errors are mostly alerts and access copy. Creator Application truthfully names unavailable uploads. Major misleading states are Moments fake success, referral verification wording and inert Settings taps. Offline queuing is not a coherent product-wide feature.

## 53. Data bounds/pagination

Discovery, profile views, Activity, call history (200), messages, relationships, Gift aggregates and transaction history use bounds. Most lack cursor pagination, so “count is bounded” is correctly explicit only in some APIs. Stories have no authoritative query. This is technical debt and a UX completeness gap, not a financial integrity flaw.

## 54. Index audit

`firestore.indexes.json` covers participant/time conversations/history, receiver/status/time calls, status/expiry and consumer/status sponsored invites, role/availability users, and following/blocked collection-group fields. Current emulator suites pass, but emulators do not prove every production composite-index requirement. Discovery/filter combinations and future pagination are the main drift risks. No index file change is made.

## 55. Physical validation ledger

| Feature | Automated | Emulator | Physical | Future physical validation? |
|---|---|---|---|---|
| Account/navigation roles | yes | role rules | approved Host tab shell | yes after deployment |
| Follow/count | yes | social/Connect | Host→Consumer Follow and realtime Host follower count | yes broader social |
| Privacy/public identity | yes | 79 checks | none documented | yes |
| Credits/recharge | yes | credit suite | none | yes with provider |
| Paid messaging | yes | access/refund | none | yes |
| Gifts/live call Gifts | yes | Gift suite | none | yes |
| VIP/Who Viewed Me | yes | VIP/privacy | none | yes |
| Rewards/Level | yes | reward/level | none | yes |
| Quick Match | yes | lifecycle | none | yes |
| Sponsored calls | yes | lifecycle | none | yes |
| Normal Agora call | yes | call rules/races | two-phone video, state, FVT, rate, controls, normal end, locks | yes for CP13–20 recovery/billing/UI |
| Media/Stories/Moments | limited | no complete flow | none | yes after Storage |

## 56. Production readiness blockers

| Blocker | Affected domains | Required decision/action |
|---|---|---|
| Firebase billing/deployment | all recent Functions/rules/indexes | enable billing and deploy reviewed artifacts |
| Storage | Creator/media/Stories/Moments/photo messages/VIP content | enable, deploy, moderation/retention plan |
| Paystack | Recharge/VIP | rotate/configure secret, adapter/webhooks, approved packages |
| Commercial values | Gifts, messaging, Quick Match, VIP discounts/plans, Level, rewards | approve versioned configs without inventing values |
| Translation provider | messaging | provider/privacy/error/cache policy |
| Push provider | follow/sponsored/notifications | provider, tokens, permissions/preferences |
| Host payout economics | earnings | source formulas, currency, settlement/compliance |
| VIP conversion/referral economics | attribution/earnings | approved formulas and qualification |
| Content/moderation | media | review/report/removal and operational ownership |
| Physical validation | calls/payments/media | deployed multi-device/provider test matrix |

## 57. What is actually usable today?

**A. Repository implemented:** core bootstrap/navigation, discovery/social/privacy/identity, calls and recovery, wallet/ledger, reward/Level, VIP, paid messaging, Quick Match, sponsored calls and Gifts have substantive repository implementations.

**B. Locally/emulator testable:** all of those authoritative foundations are covered by current unit/UI and 19 emulator scripts. Media upload and external payment/provider delivery are not safely testable as complete product flows here.

**C. Actually live against current deployed backend:** only older behavior with separate historical physical evidence can be claimed conservatively: a normal two-phone Agora call and limited Host shell/follow/count behavior. Recent CP8–20 backend behavior is **NOT DEPLOYED or deployment status UNKNOWN**, so it must not be marketed as live. The audit did not query or mutate production.

## 58. Safe to build now

**LOW DEPENDENCY:** hide/replace routed fake Moments with a truthful unavailable/empty state; make Settings rows truthful and wire the existing Blocked Users route; remove referral earning claims until authority exists; normalize Call History presentation; improve offline/error states; add pagination interfaces/cursors where current backend queries permit; inventory/remove stale routes/services. These need no invented economics/provider/Storage. Backend pagination changes would still await deployment.

**MEDIUM DEPENDENCY:** provider-independent notification preference schema/UI without claiming push; referral data model and anti-abuse specification without rewards; Host Activity Calls detail/pagination; Gift Host-side in-app acknowledgement using a carefully scoped existing Firestore artifact. Any new Functions/rules still require future deployment.

**BLOCKED:** media/content/photo messaging, real translation, commercial purchases, payout, and value-bearing policies.

## 59. Do not build yet

Do not complete Storage-dependent Stories/Moments/photo messages/Creator media; live Recharge/VIP checkout; production Gift/paid-message/Quick-Match/VIP/Level/reward economics; translation or push delivery; cash payout; VIP conversion/referral earnings. Their critical service, deployment, moderation, secret or approved-value dependencies are missing.

## 60. Potential next checkpoints

1. **Truthful UI cleanup:** remove fake Moments/referral claims and inert Settings behavior; touch no financial/call architecture; validate UI/Jest and fake-data search; client-only.
2. **Call History completeness:** exact shared row, Host Activity actions, cursor contract; preserve call finalization/accounting; emulator and UI tests; backend pagination would require later deployment.
3. **Settings/account privacy integrity:** preferred-language placeholder only if truthful, Block List routing, working/disabled account rows; avoid translation provider work; client tests.
4. **Bounded-list pagination foundation:** Activity, views, relationships, transactions and calls; no economics; rules/index emulator tests; deployment later.
5. **Notification foundation:** token-agnostic event/preference schema and in-app event coverage; choose no push provider; Functions/rules deployment later.
6. **Referral truth foundation:** replace UID-derived claim with authoritative referral identifiers/attribution/anti-abuse but award nothing; economics untouched; emulator/security tests; deployment later.

## 61. Technical debt

Bounded queries lack cursors; closed-app paid-message refund/stale recovery depend on scheduled backend operation; compatibility fields and projection logic are duplicated; emulator scripts use two fixed ports and noisy negative-case logs; several screens are dense single files; production-config absence is scattered across domains; there is no realtime Host Gift channel; Firebase CLI warns Java 17 support will end in a future major version.

## 62. Dead/stale code

High confidence: `RoleSelectionScreen` is not routed; `translationService` is mock and unused in Chat; `MomentsScreen` fake data is stale prototype logic; Settings AsyncStorage import is unused. Medium confidence: `giftingService`/`GiftingContext`, socket incoming-call handler, withdrawal/payment shells, onboarding PhotoUpload and `demoHosts.js` are superseded or development-only. No deletion occurred.

## 63. Test health

- Root Jest: **65 suites / 674 tests passed**.
- Standalone Functions Jest: **17 suites / 401 tests passed**.
- Firestore emulator: **19/19 scripts passed** (16 on 8289, 3 on 8189). A first parallel launch collided on Firebase CLI logging port; a later runner initially lacked `NODE_PATH`; the corrected isolated rerun passed. Expected permission denials and transaction retries are assertions/concurrency behavior.
- Babel parsed **327** repository JS/JSX/CJS files (328 including the temporary validator, deleted afterward); `JSON.parse` passed **274** JSON files.
- `git diff --check` and final Git integrity passed.

## 64. Checkpoint cross-validation

| CP | Claim valid? | Drift | Current evidence |
|---|---|---|---|
| 8 Privacy | yes | none found | rules, public identity, 79-check suite |
| 9 Credits | yes | no accounting drift found | credit domain/service/emulator |
| 10 Paid messaging | yes | scheduler remains absent | social Functions/access emulator |
| 11 Gifts | yes | live call context added CP20 | Gift Function/domain/emulator |
| 12 VIP | yes | config/payment still absent | VIP Function/rules/emulator |
| 13 Quick Match | yes | call billing strengthened CP14 | Quick Match/call suites |
| 14 Call billing | yes | CP20 Gift race added | call payment/recovery tests |
| 15 Sponsored | yes | story-viewer/push still absent | sponsored suite/UI |
| 16 Who Viewed Me | yes | bounded history remains | views/VIP/privacy suite |
| 17 Rewards | yes | production task config absent | reward suites/UI |
| 18 Social | yes | no regression found | social 71-check suite |
| 19 Incoming identity | yes | no regression found | public identity/call UI/privacy |
| 20 Live Gifts | yes | Host live animation deferred | Gift/call tests/emulator |

## 65. Final product-truth summary

Amira is a substantial, security-conscious repository foundation rather than a production-ready full product. Authoritative state is strongest in identity/privacy, social relationships, wallet provenance, entitlement/economic transaction mechanics and call lifecycle. The largest genuine gaps are content/media, translation, photo messaging, Settings, notifications, referral, payout and breadth of Host earnings. The largest blockers are deployment/billing, Storage, Paystack, provider choices and approved economics. The immediate work should improve truthfulness and completeness around existing foundations without pretending blocked capabilities are live.

## 66. Confirmation no feature implementation

No product, source, test, rule, index or configuration behavior was changed. Only the two audit artifacts were created.

## 67. Confirmation no production mutation

No production Firebase record/configuration, user, payment, Gift, call, Storage object or provider state was read for validation or mutated.

## 68. Confirmation no deployment

No application, Functions, Firestore rules/indexes or Storage deployment occurred. Firebase billing was not enabled.

## 69. Confirmation no staging

Nothing was added to the Git index.

## 70. Confirmation no commit

No commit was created; HEAD remains `fec9cb0260f5451a279eff64c6534f2efe1a54f0`.

## 71. Confirmation no push

No remote write or push occurred.
