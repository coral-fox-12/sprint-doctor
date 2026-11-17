# Sprint Doctor — Forge deploy status (2026-11-17)

## Done
- Scaffold verified: tests 14/14 pass (`npm test`); `forge lint` runs (see workarounds).
- Fixed a real manifest bug: Rovo agent prompt was `resource:agent-prompt;prompts/agent-prompt.md`
  (lint resolved it as `prompts/prompts/agent-prompt.md`, ENOENT) → now `resource:agent-prompt;agent-prompt.md`.
- GitHub repo (public): https://github.com/coral-fox-12/sprint-doctor @ a364eed
- Forge CLI 15.1.0 installed and working (local install in /tmp/forge-install; see .forge-env/README.md).

## Blocked — needs the parent (browser task)
1. **Atlassian API token — the critical blocker.** `forge login` needs an API token
   (`-u <email> -t <token>`); none exists in the ledger. Create one at
   https://id.atlassian.com/manage-profile/security/api-tokens signed in as
   coral-fox-12@proton.me (password in ~/workspace/makefun/accounts-created.json
   under accounts.atlassian_coralfox). Then, from this repo dir:
   ```
   SNAP=1 LD_PRELOAD=$PWD/.forge-env/nochown.so /tmp/forge-install/node_modules/.bin/forge login -u coral-fox-12@proton.me -t <TOKEN> --non-interactive
   ```
2. **`npm install` dies at startup in this sandbox** (npm exits ~2s in, no log, no output;
   host memory ~640–900MB available, writes flap with EPERM under load). The deploy
   bundler (@forge/bundler) resolves imports from node_modules, so a complete
   `node_modules` is required before `forge deploy`. Retry the install later or from a
   less loaded environment:
   ```
   LD_PRELOAD=$PWD/.forge-env/nochown.so NODE_OPTIONS=--max-old-space-size=512 npm install --ignore-scripts --no-audit --no-fund --prefer-offline
   ```

## After the two blockers clear
```
SNAP=1 forge register            # fills app.id in manifest.yml (currently REPLACE-WITH-FORGE-REGISTER-ID)
SNAP=1 forge deploy              # deploys to development environment
SNAP=1 forge install --site https://coral-fox-12.atlassian.net --product jira
```
Then: create a Jira project + sample issues on the dev site (Jira REST API, Basic auth
email + the same API token) and capture the installation link for the judges.
Devpost submission + demo video are handled separately by the parent.
