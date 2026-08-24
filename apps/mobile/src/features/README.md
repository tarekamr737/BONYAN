# Mobile feature convention

Each workstream owns one folder below this directory and keeps its UI, API calls,
hooks, and types together:

```text
src/features/<feature>/
├── api/
├── components/
├── hooks/
├── screens/
└── types/
```

Create only the folders a feature actually uses. Export route-level screen components
from the feature package; Workstream 01 adds the small Expo Router adapter in `app/`
after merge. Feature code may use `src/core` but must not import another feature's
internals.
