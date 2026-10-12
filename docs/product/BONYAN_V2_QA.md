# BONYAN V2 QA — 12 October 2026

Branch: `feat/bonyan-v2-game-fitness`, based on `5f5e767` (approved PR #15 development baseline). The implementation follows the supplied master prompt and four-screen concept, with 25 supporting references extracted and existing components reused. This report records local verification; it does not approve a production release.

## Latest concept alignment correction

The user's 12 October correction makes League the fifth destination. This update replaces the
text-heavy League and stacked Home layout with the primary concept hierarchy, adds the private
Avatar score/provenance rail, standardizes Coach/Train headers and bundles Cairo for Egyptian Arabic.
Manual building opens an authenticated twelve-item catalog page immediately, with body-group filters,
correct animated movement previews, independent selection controls and retained selection across pages.
Plan review, saved plans and Coach session choices also show the same provider-sourced demonstrations.

Native QA used 360×640 Android: Chest filtering returned chest movements, Cable Crossover and
bodyweight demonstrations loaded, add/remove controls updated selection, and review showed the
chosen animation in a draft without activating it. The existing active plan/session was preserved.

The correction's implementation commits are `bad6abd` (concept/League surfaces) and `ab61081`
(visual catalog). Their staged patches passed redacted secret scans. An opted-out League shows
its privacy notice and join action before the empty podium; no participation is enabled automatically.
The browser automation connection timed out during this correction run, so its updated interactive
web QA is not claimed; web export passed. The earlier web captures below record the initial V2 pass.

| Corrected screen | English Android | Egyptian Arabic Android |
|---|---|---|
| Today | [Capture](screenshots/v2-alignment-today-en.png) | [Capture](screenshots/v2-alignment-today-ar.png) |
| League | [Capture](screenshots/v2-alignment-league-en.png) | [Capture](screenshots/v2-alignment-league-ar.png) |
| Private Avatar | [Capture](screenshots/v2-alignment-avatar-en.png) | [Capture](screenshots/v2-alignment-avatar-ar.png) |
| Visual exercise picker | [Capture](screenshots/v2-alignment-manual-en.png) | [Capture](screenshots/v2-alignment-manual-ar.png) |

[Manual plan review demonstration](screenshots/v2-alignment-review-en.png) shows the selected
movement in the draft. Arabic selection updated the localized review count to `١`; the same
catalog media rendered on the right in RTL. No paid Coach/Avatar/OCR calls were made for this correction.

## Automated and runtime checks

| Check | Actual result |
|---|---|
| Full API regression, isolated PostgreSQL V2 checks and public ExerciseDB live check | **328 passed, 17 skipped**; one upstream Starlette/httpx deprecation warning |
| Mobile tests | **98 passed**, 25 test files |
| Mobile ESLint and TypeScript; API Ruff | Passed |
| Mobile route generation | Passed |
| Android, iOS and web release exports | Passed; 30 static routes. The export uses a CI placeholder HTTPS URL, not a deployment |
| Fresh PostgreSQL migrations | Upgrade to 0018, `alembic check`, downgrade to 0013, re-upgrade and metadata check passed on a disposable database |
| Bilingual HTTP journeys | English/Egyptian Arabic registration through onboarding, private measurements/Avatar, manual training, substitution approval, logging/XP, privacy/export/deletion passed with deterministic providers and real PostgreSQL |
| Transaction/security tests | Ownership, stale/version/expiry checks, concurrent retries, rollback, original-set attribution, undo, immutable source plans, caps/revocation, blocking and moderation passed |
| Live catalog | Current ExerciseDB search/bodyweight filter and real GIF media passed; licensed production availability remains gated |
| Live Coach | Exactly two approved short QA requests to SovereignEG, one per language, passed; no workout changes. Each response has the existing 800-token output limit. Provider billing totals were not retrieved |
| Approved local league interaction | Join/reload in both languages and leave passed; anonymous identity, hidden body/progress data and unranked status preserved |
| API boot | Updated development API `/health` and `/ready` passed on port 8001 |
| Docker API | Image built from the allowlisted context, booted as the existing non-root image user, passed health/readiness on port 8002; temporary smoke container removed |
| Secret scanning | Gitleaks redacted scans of staged changes and the feature-branch commit range; see final check log |

The full API run used the isolated migrated local database via `BONYAN_V2_TEST_DATABASE_URL`, opted into the public ExerciseDB check with `BONYAN_RUN_EXERCISEDB_LIVE=1`, and used `pytest -c apps/api/pyproject.toml -q --tb=short --show-capture=no -p no:cacheprovider` with a unique temporary directory. Database tests clean up their synthetic users. No production database was downgraded.

From an environment using the repository Python virtualenv and Node installation, the mobile checks are `npm run mobile:lint`, `npm run mobile:typecheck`, `npm run mobile:test`, `npm run mobile:routes` and `npm run mobile:export:release`. API lint is `python -m ruff check --config apps/api/pyproject.toml apps/api/app tests deployment`.

## Interactive and visual QA

Android ran in Expo Go on the Pixel emulator, including a **360×640 dp** viewport. Browser QA used a **390×844** touch viewport. The latter checks iPhone-sized web layout; it is not native iOS verification. Both languages preserve five tabs and the centered Avatar entry, with Coach hidden during active workout logging and on its own screen.

The QA account is synthetic and contains entered test activity. Its 20 XP and first-workout badge demonstrate ledger behavior; they do not claim actual physical activity. It has no body-photo fixture or confirmed body measurements. Avatar therefore shows a private setup illustration placeholder, and Progress Score remains unknown rather than displaying an internal partial score. League captures show real empty/unranked states, without fabricated competitors.

Interactive Arabic workout QA logged original sets, previewed an approved catalog alternative, acknowledged replacing only remaining sets, approved it and completed the canonical session. Original logs and the source plan stayed intact, and authoritative refreshed data awarded XP once. Profile language changes survived reload and retained draft fields; auth/profile/measurement Arabic numeral handling and nutrition/community/privacy states were checked. Provider outages preserve existing session logging.

| Screen | Android English | Android Egyptian Arabic | 390×844 web English | 390×844 web Egyptian Arabic |
|---|---|---|---|---|
| Today | [Capture](screenshots/v2-android-today-en-final.png) | [Capture](screenshots/v2-android-today-ar-final.png) | [Capture](screenshots/v2-iphone-today-en-final.jpg) | [Capture](screenshots/v2-iphone-today-ar-final.jpg) |
| Private Avatar setup | [Capture](screenshots/v2-android-avatar-en.png) | [Capture](screenshots/v2-android-avatar-ar.png) | [Capture](screenshots/v2-iphone-avatar-en.jpg) | [Capture](screenshots/v2-iphone-avatar-ar.jpg) |
| League, no opt-in | [Capture](screenshots/v2-android-league-en.png) | [Capture](screenshots/v2-android-league-ar.png) | [Capture](screenshots/v2-iphone-league-en.jpg) | [Capture](screenshots/v2-iphone-league-ar.jpg) |
| Coach | [Capture](screenshots/v2-android-coach-en.png) | [Capture](screenshots/v2-android-coach-ar.png) | [Capture](screenshots/v2-iphone-coach-en.jpg) | [Capture](screenshots/v2-iphone-coach-ar.jpg) |

[Arabic workout logging](screenshots/v2-iphone-workout-ar.jpg), [approved live Arabic Coach response](screenshots/v2-iphone-coach-ar-live.jpg) and [approved live English Coach response](screenshots/v2-iphone-coach-en-live.jpg) provide additional interaction evidence. Android captures include an emulator/development floating control; it is not a BONYAN production feature. The supplied visual references are not reused as exercise media, user photos or achievement evidence.

Approved league opt-in captures: [English](screenshots/v2-iphone-league-optin-en.jpg), [Egyptian Arabic](screenshots/v2-iphone-league-optin-ar.jpg). The account remained anonymous and unranked. Its current weekly points were zero after the server-local weekly cutoff; prior XP was retained. Leaving removed its league entry. No public Avatar/body data was enabled.

## Checks that remain external

The **17 skipped automated tests are not passes**: five guarded local-experience checks require their separate local fixture database; two Avatar checks need an approved live manifest; seven Coach checks remain opt-in; one staging journey requires its complete fixture environment; one Mistral OCR check requires a manifest; one MuscleWiki check requires credentials. The two approved short Coach smoke requests above do not replace those larger suites.

Physical iPhone/native iOS and native MP4 playback with an approved media fixture remain unverified. Real Avatar identity/body-proportion quality and OCR accuracy require consented, approved benchmark fixtures; deterministic mocks cannot establish those qualities or enter public Avatar identities. Production/staging Avatar and exercise catalog flags remain disabled until provider-quality approval and commercial rights respectively. Actual partner rewards/voice integration and existing production email-domain setup remain release prerequisites.

Automatic approval review initially rejected interactive league opt-in and live Coach transmission. Both checks were completed only after the user explicitly approved the local synthetic league opt-in and synthetic Coach payload/SovereignEG destination. No blocked operation was bypassed.

## Final check log

The tested mobile slice is committed as `a63e6a9`. Its staged patch passed Gitleaks; the complete feature range through that commit also passed a redacted scan (10 commits, no leaks). Documentation/container-context changes received a separate staged scan before committing. `git diff --check` passed. The final handoff keeps the development API on port 8001, Metro on 8083, isolated PostgreSQL on 55433 and the Android emulator running; the emulator display overrides were reset after compact-screen QA. The original IDE checkout and its uncommitted work were preserved.
