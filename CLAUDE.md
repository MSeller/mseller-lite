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
