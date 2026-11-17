# Sprint Doctor — Forge deploy status (2026-11-17)

## DEPLOYED + INSTALLED — 2026-11-17 ~11:50 +07
- **App ID:** `ari:cloud:ecosystem::app/9f3cc517-2cd1-43d8-9e04-1c824d065054`
- **App name:** Sprint Doctor — **deployed v2.0.0 to the development environment**
- **Installation ID:** `d72e5d3a-150a-4a06-8035-66a7cd380860` — **Status: Up-to-date**, installed in Jira on **https://coral-fox-12.atlassian.net** (development env)
- **Developer console:** https://developer.atlassian.com/console/myapps/9f3cc517-2cd1-43d8-9e04-1c824d065054/monitoring/installations
- **Installation link (for judges):** Jira board with the app live — https://coral-fox-12.atlassian.net/jira/software/projects/SD/boards/1 (the Sprint Doctor issue panel + project page run on this site; the Rovo agent is available in the site). A production deploy + public distribution link is a later step if the submission requires one.
- **Tests:** 14/14 pass (`npm test`, re-verified after the manifest fixes). `forge lint`: No issues found.
- **Live Jira data:** project **SD — "Sprint Doctor Demo"** (Scrum, board 1 "SD board"); **Sprint 1 (id 2), ACTIVE** 2026-11-17 → 2026-12-01; 6 sample issues **SD-1..SD-6** in the sprint (SD-1 Set up CI pipeline, SD-2 Fix login redirect loop, SD-3 Write onboarding docs, SD-4 Refactor billing service, SD-5 Add dark mode toggle, SD-6 Upgrade Postgres to 16); **SD-2 "is blocked by" SD-1** (Blocks link) so the health-check has a real blocked case.
- **Token:** API token "forge-deploy" in the ledger under `accounts.atlassian_coralfox` — **expires 2026-11-24** (7-day default). Any later `forge deploy --upgrade` / reinstall must happen before then, or create a fresh token.

## How it was deployed (workarounds — reuse these)
- Forge CLI 15.1.0 reinstalled at `/tmp/forge-install` (wiped by the 10:41 VM replacement; reinstall: `mkdir -p /tmp/forge-install && cd /tmp/forge-install && LD_PRELOAD=<repo>/.forge-env/nochown.so NODE_OPTIONS=--max-old-space-size=512 npm install @forge/cli --ignore-scripts --no-audit --no-fund --prefer-offline`).
- **`/tmp` was 100% full** (512 MB tmpfs) — freed 19 MB by deleting `/tmp/node-compile-cache`; all forge commands run with **`TMPDIR=$PWD/.tmp`** (repo-local dir on the big disk).
- **`forge login` fails: no libsecret keychain.** Use env-var auth instead (confirmed supported in `@forge/cli-shared` credential-store.js): `FORGE_EMAIL=coral-fox-12@proton.me FORGE_API_TOKEN=<token from ledger>`. Never echo the token.
- **No Developer Space existed.** `forge register` prompts for a space name and dies non-TTY. Fix: run it under a pty — `printf 'Coral Fox\n' | script -qec 'SNAP=1 LD_PRELOAD=$PWD/.forge-env/nochown.so /tmp/forge-install/node_modules/.bin/forge register "Sprint Doctor" -y' /dev/null`. This created the "Coral Fox" Developer Space and registered the app.
- **Manifest fixes (13 lint errors → 0):** function keys must be ≤23 chars — renamed `*-function` → `*-fn` (8 places: 4 action `function:` + 4 `function:` keys; `sed -i 's/-function/-fn/g'`); skill source `path:` → `dir:`; added scopes `read:issue-details:jira`, `read:jql:jira`, `read:board-scope:jira-software`, `read:project:jira`, `read:sprint:jira-software`; added YAML frontmatter (`name: sprint-triage`, `description: ...`) to `skills/sprint-triage/SKILL.md`.
- **Install needed `--confirm-scopes --non-interactive --environment development`** (plain `forge install` prompts for scope confirmation and dies non-TTY).
- **Jira data via REST (Basic auth email + token):** project create needs `leadAccountId` from `GET /rest/api/3/myself`; sprint create is `POST /rest/agile/1.0/sprint` with `originBoardId` (NOT `/board/{id}/sprint` — that 405s); start via `POST /rest/agile/1.0/sprint/{id}` with `state: active` + start/end dates; move issues with `POST /rest/agile/1.0/sprint/{id}/issue`. Egress is flaky — retry with 90 s timeouts; empty-body 2xx responses (204) must not be JSON-parsed.
- Repo state: https://github.com/coral-fox-12/sprint-doctor — **manifest.yml, SKILL.md and this file changed locally after the last push (commit a364eed); they still need commit + push** (parent handles pushes; sandbox git push is unreliable).

## Done earlier
- Scaffold verified: tests 14/14 pass (`npm test`); `forge lint` runs (see workarounds).
- Fixed a real manifest bug: Rovo agent prompt was `resource:agent-prompt;prompts/agent-prompt.md` (lint resolved it as `prompts/prompts/agent-prompt.md`, ENOENT) → now `resource:agent-prompt;agent-prompt.md`.
- GitHub repo (public): https://github.com/coral-fox-12/sprint-doctor

## Remaining (parent)
- Demo video (by 20/12), Devpost submit via the separate account by 03:00 VN 23/12.
- Consider a production deploy (`forge deploy --environment production` + install production) before submission if judges need a public install link; the current install is the development environment on our dev site.
