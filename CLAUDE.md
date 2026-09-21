# mseller-lite

## Package Manager

pnpm is the ONLY package manager for this repo, in every worktree.

- Install: `pnpm install` — never `npm install` or `yarn`
- Add / remove: `pnpm add <pkg>` / `pnpm remove <pkg>`
- Run scripts: `pnpm <script>`
- CI and any clean install: `pnpm install --frozen-lockfile`
- Commit `pnpm-lock.yaml`. Never create or restore `package-lock.json` or `yarn.lock`
- New worktree: run `pnpm install` inside it — do not copy or symlink `node_modules`
- Migrating: run `pnpm import` first to preserve pinned versions, then delete the old lockfile
- Yarn `resolutions` become `pnpm.overrides`, using `>` separators and one level only
  (`"@mui/x-data-grid>@mui/system": "5.12.1"`)
- React Native / Expo repos require `node-linker=hoisted` in `.npmrc`

## API: Consumo ONLY

mseller-lite talks to the **Consumo API** and nothing else. Every call goes through
`services/api.ts`'s `restClient` as a **relative** path under `/consumo/*`.

- Never call `/portal/*`, and never build an absolute URL to another API host.
- If a capability you need only exists in Portal.Api, the fix is to expose it in Consumo as a
  thin controller delegating to the SAME service in `Common` — not to reach across from the
  app. Precedents in `mseller-api`: `OnboardingController` and `PedidoPortalService` (the
  latter registered in Consumo for the MCP write tools).

Why this is a rule and not a preference: onboarding used to be the app's single Portal call,
addressed by absolute URL built from the business config's portal host. That made signup
depend on a second host being configured correctly in every environment — and in local
development it simply cannot work, because Consumo and Portal are two processes on two ports
(7173 and 5186) and Portal binds to loopback only, so a phone on the LAN can never reach it.
The failure surfaced as `404` from the onboarding call, which reads like a backend outage
rather than a configuration problem, and cost real time to diagnose.

One host means the app is reachable wherever Consumo is reachable, and there is no second
address to get wrong.

## Registration Parity with mseller-cloud

Sign up (email and Google), the business setup wizard and account deletion mirror
cloud.mseller.app and must stay aligned with mseller-cloud. When mseller-cloud's register or
onboarding flow changes, update this app in a paired PR; when a change here affects what the
backend stores, change the portal first. The file map and contract are in
`docs/REGISTRATION_PARITY.md`.
