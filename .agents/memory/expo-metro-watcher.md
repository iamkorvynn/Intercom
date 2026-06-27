---
name: Expo Metro watcher crash after pnpm install
description: ENOENT crash when Metro FallbackWatcher tries to watch pnpm _tmp_ directories that are deleted during postinstall.
---

## The rule
After any `pnpm add` that installs packages with postinstall scripts (e.g. `es-abstract`, `@livekit/react-native-webrtc`), Metro's FallbackWatcher may crash with:
`ENOENT: no such file or directory, watch '...node_modules/.pnpm/PKGNAME/node_modules/PKGNAME_tmp_NNNN/...'`

**Why:** pnpm creates temp directories during postinstall, then deletes them. If Metro starts before cleanup finishes it tries to watch a path that no longer exists.

**How to apply:**
1. Add a blockList in `metro.config.js` matching `/_tmp_\d+/`
2. Simply restart the workflow again — by the time you restart, temp dirs are gone and the second start succeeds.
3. The workflow timeout of 60s is enough; if it still fails after blockList fix, it's a different issue.
