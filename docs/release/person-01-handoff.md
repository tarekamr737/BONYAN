# Person 01 Integration Handoff

> Historical record: this was the Workstream 06 pre-integration handoff. For the current release
> decision, see [release-candidate-status.md](release-candidate-status.md).

Workstream 06 is ready for integration review on `feat/06-release-hardening`, based on main commit
`2d1736b8cba7ce31e7e3f7ea8fc136e556e23d5f`.

## Confirm before merge

- Confirm `com.bonyan.app` as both Android application ID and iOS bundle identifier, or provide the
  owned identifiers before any signed build is created.
- Select the staging/production host, HTTPS domains, and persistent private-storage target. The
  repository intentionally does not choose a paid platform.
- Configure protected GitHub `staging` and `production` environments as documented, including
  required production reviewers.
- Supply the Expo/EAS project association and externally managed Android/iOS signing credentials.
- Historical integration requirement, now completed: merge Person 05's provider work, then re-run
  migrations and account-deletion coverage for `20260904_0007` source-photo persistence without
  dropping either workstream's hardening.

## Evidence and remaining gates

- Review [the release checklist](checklist.md), [deployment procedure](deployment.md), and
  [performance record](performance-sanity.md).
- CI-equivalent local checks and all-platform Expo export pass. GitHub Actions run `33597510534`
  passed its mobile checks/export, PostgreSQL 17 migrations, and release-container build for commit
  `88f5b6d98bc265da65f30c068a68b610a8afe4a7`.
- Live staging smoke/restore, signed native builds, real-device QA, provider latency, and video
  startup remain release gates. No native or staging PASS is claimed.
