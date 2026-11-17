# Sprint Doctor — Devpost submission draft (Codegeist 2026)

## Tagline

Your sprint has a doctor now: every issue scored, every blocker named, every next step spelled out — inside Jira.

## Description

Sprint Doctor is a Forge app for Jira that health-checks a live sprint.
Open the Sprint Doctor tab on any project and you see the sprint's
health score, which issues are blocked, which have gone stale, who is
overloaded, and the concrete next action for each problem — all computed
from live Jira data by a deterministic, explainable engine. Each issue
also gets its own health card in the issue panel. And in Rovo chat you
can simply ask "What's blocking this sprint?" — the Sprint Doctor agent
answers from the same engine and, only with your explicit confirmation,
posts the triage summary as an issue comment.

## How it meets the technology requirement

Built entirely on Atlassian Forge (Node.js): a `rovo:agent` with four
`action` modules and a `rovo:skill`, a `rovo:mcp` module exposing the
same read-only actions as MCP tools, a `jira:issuePanel` and a
`jira:projectPage` (UI Kit), all reading Jira through `@forge/api`
(`api.asUser()`, Agile board/sprint endpoints + JQL). No external
services, no external storage, no egress.

## Category

Apps for Software Teams.

## Bonus prizes selected

- **Best Agents — Rovo/Assignable agents**: the app includes a
  `rovo:agent` with reusable actions other agents can invoke.
- **Best app with Atlassian MCP**: the app exposes its read-only tools
  via the `rovo:mcp` module.

## Try it out / installation

1. Install via the installation link: [ADD AFTER DEPLOY — parent step]
2. Open any Jira project → the "Sprint Doctor" tab shows the sprint
   triage board; open any issue → the Sprint Doctor panel shows that
   issue's health card.
3. In Rovo chat, ask Sprint Doctor: "What's blocking this sprint?"
4. Requires a Jira Cloud site; Rovo chat needs a Standard/Premium plan
   (a trial includes it). The panels work on any plan.

## Video

YouTube demo (public, under 5 minutes): [ADD AFTER RECORDING — parent step]

## Source code

[ADD PUBLIC GITHUB REPO LINK — push under coral-fox-12 after deploy]
