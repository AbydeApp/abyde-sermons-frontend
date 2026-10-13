# Abyde Sermon — Web App

Authenticated application UI (auth, onboarding, dashboard). The public marketing site lives in a separate repo.

## Develop

```bash
pnpm install
pnpm dev
```

Leave `NEXT_PUBLIC_API_URL` unset to run against the built-in browser mock API (demo login: `demo@abydesermon.app` / `demo1234`, or sign up for an empty account). Set it to point at the real backend.

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## API contract

The app talks to the backend exactly as specified in `ABYDE_SERMON_BACKEND.md` + Addendum A (paths under `/api/v1`, `{data, meta}` lists, `{errors}` error envelope, cookie session, presigned uploads). Set `NEXT_PUBLIC_API_URL` to the API base including `/api/v1`. With it unset, an in-browser mock backend implements the same contract.

V1 is Nigeria-only: all schedules are interpreted in `Africa/Lagos` (WAT); there are no country, timezone or notification settings.
