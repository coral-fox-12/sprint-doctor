# Sprint Doctor — Codegeist 2026 entry

A Jira Forge app that health-checks a live sprint and tells the team
exactly what's stuck, stale, or about to slip — with the fix for each
issue. Category: **Apps for Software Teams**. Bonus targets: **Best
Agents** (Rovo agent) and **Best app with Atlassian MCP**.

## What it does

- **Issue panel** (`jira:issuePanel`): a health card on every issue —
  0–100 score, level, and each finding with a suggested next action.
- **Project page** (`jira:projectPage`): the sprint triage board —
  overall sprint score, blocked / stale / at-risk counts, overloaded
  assignees, and the issues that need attention first.
- **Rovo agent** (`rovo:agent` + actions + a `rovo:skill`): ask "What's
  blocking this sprint?" in Rovo chat; the agent answers from the same
  engine and can post an approved triage summary as an issue comment.
- **MCP** (`rovo:mcp`): the same read-only actions exposed as MCP
  tools for Rovo Studio agents.

The scoring is deterministic and explainable: blocked-by links,
days since the last update, time stuck in one status, missing
estimates, thin descriptions, missing assignees, overdue dates,
assignee overload, and scope creep. No external LLM, no external
storage, no egress — everything runs on Forge.

## Layout

```
manifest.yml              Forge manifest (app.id is filled by `forge register`)
src/lib/triage.js         Pure deterministic engine (tested)
src/lib/jira-adapter.js   Jira REST issue -> normalized issue
src/lib/fixtures.js       Invented demo sprint (labelled DEMO everywhere)
src/index.js              Forge action handlers + UI Kit resolver
src/frontend/index.jsx    UI Kit entry (issue panel + project page)
src/frontend/project-page.jsx  Sprint board component
prompts/agent-prompt.md   Rovo agent prompt
skills/sprint-triage/     Rovo skill playbook
tests/triage.test.mjs     node:test suite
demo/demo-harness.mjs     CLI demo on fixture data
```

## Run the tests / demo (no Atlassian account needed)

```bash
npm test     # engine tests (fixtures + edge cases)
npm run demo # sprint brief on the invented fixture sprint
```

## Deploy (needs an Atlassian account — parent step)

```bash
npx @forge/cli login
npx @forge/cli register        # fills app.id in manifest.yml
npx @forge/cli deploy
npx @forge/cli install         # install on a dev Jira site (Standard/Premium trial for Rovo)
```

Then create the installation link for the judges (Forge docs:
"Distribute your apps" → "Start sharing your app").

## Honesty notes

- Scores come only from live Jira data. The local demo uses invented
  fixture data and labels every output DEMO.
- The write action (post triage comment) only runs after the user
  explicitly confirms the exact summary text in chat.
- The demo video (see DEMO_SCRIPT.md) shows the app on a real dev
  Jira site once deployed; until then the harness output is the demo.
