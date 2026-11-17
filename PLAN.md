# Codegeist 2026 — PLAN.md

## 1. Verified facts (official Devpost rules page, read live 2026-11-17)

- **Hackathon:** Codegeist 2026 — "Build with context. Ship with confidence." Sponsor Atlassian Pty Ltd, admin Devpost. Official page: https://codegeist2026.devpost.com (rules: https://codegeist2026.devpost.com/rules)
- **Prize pool: $120,000 cash total.**
  - Grand prizes, 3 categories × (1st $15,000 / 2nd $8,000 / 3rd $5,000) = $84,000. 1st place also gets 2 tickets to Team '27 (AMER, travel not included), blog recognition, limited-edition swag.
  - Bonus prizes: 24 × $1,500 = $36,000 — six each for Best Agents (Rovo/Assignable agents), Best app with Atlassian MCP, Best Teamwork Graph integration, Best Marketplace published app.
  - Participation swag pack for the first 300 eligible submissions (max 4 per submission).
  - One submission can win at most one Grand Prize + one Bonus Prize. One entrant may submit multiple unique submissions.
- **Deadline: Tuesday, Dec 22, 2026, 12:00 pm Pacific Time (PST) = 20:00 UTC = 03:00 VN Wednesday, Dec 23, 2026.** Judging Jan 5 – Feb 3, 2027. Winners announced on or around Feb 15, 2027.
- **Eligibility: Vietnam is ELIGIBLE.** Rules §3 excludes only residents of Brazil, Quebec, Russia, Belarus, Crimea, Cuba, Iran, North Korea, Syria, Sudan, Myanmar, and OFAC-designated countries. Entrants must be age of majority where they reside. Individuals, teams, or organizations.
- **What to create:** an app built on Atlassian Forge that integrates with at least one Atlassian product/capability (Jira, Confluence, Jira Service Management, Bitbucket, Teamwork Graph, Rovo), in one of three categories:
  - **Apps for Software Teams** ← our entry
  - Apps for Business Teams
  - Apps for Specialized Industries
- **Submission requirements (rules §4):**
  - Demo video < 5 minutes, publicly visible on YouTube, link on the submission form. Judges need not watch past 3 minutes.
  - An **installation link** for judges to install the app in their test environment.
  - Text description explaining features/functionality + how the project meets the tech requirement.
  - Instructions to get the app working in a judges' environment.
  - Original work, solely owned by the entrant; open-source components allowed if licensed and built upon.
  - Select the Category and Bonus Prizes; provide any bonus write-up.
- **Judging (§6):** Stage 1 pass/fail (fits theme, applies required APIs/SDKs). Stage 2, five equally weighted criteria (20% each): Technological Implementation, Design, Potential Impact, Innovation/Idea, Presentation.
- **Prize delivery (§8):** paid to the entrant (bank transfer or mailed check) after a winner affidavit + required forms; non-US winners complete a **W-8BEN**. Delivered within 60 days of completed forms. Prizes are the entrant's responsibility for taxes/fees.
- **Accounts needed (parent steps — do NOT do these in this task):**
  1. A **Devpost account** to register + submit. ✅ DONE (2026-11-17 ~06:25, via the device browser): the agent's separate account **devpost20261117@proton.me** (display name "coral-fox-12 Fox", username devpost20261117, profile https://devpost.com/devpost20261117, sign-in verified). Use this account for the Codegeist submission — do NOT touch the user's own Devpost account.
  2. A free **Atlassian Cloud Developer License** + Atlassian account for `forge login` / `forge register` / `forge deploy` and for creating the installation link. Sign up at https://developer.atlassian.com/cloud/. (Still open — the only account blocker left.)

## 2. Concept — "Sprint Doctor"

**One line:** a Jira Forge app that health-checks a live sprint and tells the team exactly what's stuck, stale, or about to slip — with the fix for each issue.

**The real problem:** every Jira team has sprints that quietly rot — blocked issues nobody notices, tickets untouched for two weeks, work with no estimate, one person carrying half the sprint. Scrum masters find out in the retro, too late. Sprint Doctor surfaces it continuously, inside Jira, with concrete next actions per issue.

**What it is (a real app first, not an agent wrapper):**
- A deterministic **triage engine** (pure JS, fully tested) that scores every issue in the active sprint on real signals: blocked-by links, staleness, time stuck in one status, missing estimates, thin descriptions, missing assignee, overdue dates, assignee overload, scope creep. Each issue gets a 0–100 health score, a level, and findings with suggested next actions.
- A **Jira issue panel** (`jira:issuePanel`, UI Kit) — per-issue health card with findings.
- A **Jira project page** (`jira:projectPage`, UI Kit) — the sprint triage board: overall sprint score, counts by level, the blocked/stale/at-risk lists, and one-click "post triage comment" (user-confirmed, never automatic).
- A **Rovo agent** (`rovo:agent` + `action` modules + one `rovo:skill`) as a *natural interface to the same engine* — "What's blocking the sprint?" in Rovo chat. It qualifies for the **Best Agents** bonus ($1,500 × 6) without the app depending on it: if Rovo is unavailable, the panels still do everything.
- A **Rovo MCP module** (`rovo:mcp`) exposing the same read-only actions as MCP tools — qualifies for the **Best app with Atlassian MCP** bonus as a second shot (only one bonus can be won per submission; the app targets Best Agents first).
- **Deliberately NOT used:** Teamwork Graph (Preview API, needs org-admin install + paid plan — untestable without a dev site), Marketplace publication (review cycle; noted as a post-deadline option).

**Why this fits our skills:** pure JS/TS engine + UI Kit + Forge functions, same stack as our other entries (Recall, AgentifyJS). No external LLM, no external storage, no egress — the app runs entirely on Forge, which also answers the judges' "genuine, non-trivial implementation" criterion.

**Honesty rules enforced in code:**
- Scores come only from live Jira data (or clearly-labelled fixture data in the local demo harness). Never an invented price, metric, or issue.
- The write action (post triage comment) only runs after explicit user confirmation in chat; the agent prompt forbids silent writes.
- The demo harness labels fixture data as DEMO on every output.

## 3. Architecture

```
manifest.yml                  Forge manifest (app.id filled by `forge register` — parent step)
package.json                  @forge/api, @forge/resolver, @forge/react (UI Kit)
src/
  lib/
    triage.js                 PURE engine: scoreIssue, scoreSprint, findings (no Forge imports)
    jira-adapter.js           Jira REST issue -> normalized issue (fields, links, changelog)
    fixtures.js               Realistic fixture sprint (10 issues) for local tests/demo
  index.js                    Forge action handlers (GET x3, CREATE x1) + resolver wiring
  frontend/
    index.jsx                 UI Kit issue panel (per-issue health card)
    project-page.jsx          UI Kit project page (sprint triage board)
prompts/
  agent-prompt.md             Rovo agent prompt (manifest references it as a resource)
skills/sprint-triage/
  SKILL.md                    rovo:skill playbook: how the agent runs a triage
tests/
  triage.test.mjs             node:test suite for the pure engine (fixtures + edge cases)
demo/
  demo-harness.mjs            CLI: run the engine on fixtures, print the sprint brief
```

**Data flow (live):** Jira REST API (`api.asUser().requestJira`, Agile board/sprint endpoints + JQL) → `jira-adapter.js` normalizes → `triage.js` scores → panels/agent render. **Data flow (local):** fixtures → same engine → same output shape; the harness prints it.

**Scopes (manifest `permissions.scopes`):** `read:jira-work` (read issues/sprints), `write:jira-work` (post triage comment only, user-confirmed).

**Forge runtime:** nodejs22.x (template default; Node 24 also supported by Forge CLI 15 — keep 22.x for template compatibility).

## 4. Submission checklist (from rules §4)

- [ ] Atlassian account + free Cloud Developer License (parent step)
- [ ] `forge login` → `forge register` (fills `app.id` in manifest.yml) → `forge deploy` → `forge install` on a dev Jira site (parent step)
- [ ] Installation link created (Forge distribute-your-apps flow) — required for judges
- [ ] Demo video < 5 min, public on YouTube (parent records; see DEMO_SCRIPT.md)
- [ ] Devpost submission: text description, how it meets the tech requirement, category = Apps for Software Teams, bonus prizes selected = Best Agents (+ MCP as second), setup instructions for judges
- [ ] Public GitHub repo (not required by rules, but good practice — push under coral-fox-12)
- [ ] Internal target: deploy + install test done by Dec 18; video recorded by Dec 20; submit by Dec 22, 12:00 PT (Dec 23, 03:00 VN)

## 6. Validation status (2026-11-17, this session)

- Engine tests: **14/14 pass** (`npm test`) — scoring, sprint totals, adapter mapping, edge cases (empty sprint, all-done sprint, determinism).
- Demo harness: works — fixture sprint brief is coherent (69/100 watch, 1 blocked, 3 stale, 2 at-risk).
- Manifest: **structurally validated** with a schema cross-check script (all module/action/function/resource/skill references resolve, all resource paths and handler exports exist, scopes present, agent name within 30 chars). No errors.
- `forge lint`: **could NOT run in this sandbox** — `npm install` is broken here (fails with a bogus permissions error even for a tiny package; the npx cache holds only a partial @forge/cli without its dependencies, e.g. missing `tslib`). This is an environment limitation, not a manifest problem. `forge lint` + `forge deploy` + `forge install` remain parent steps once the Atlassian account exists.
- Live Jira testing: not possible until the Atlassian account + dev site exist (parent step). The engine is fully tested locally; the Forge wiring follows the official documented module schemas (rovo:agent, action, rovo:mcp, rovo:skill, jira:issuePanel, jira:projectPage — all read live from developer.atlassian.com on 2026-11-17).

## 7. Risks

- **No Atlassian account yet** — the app cannot be deployed/installed/tested live until the parent creates one. Mitigation: the engine is fully tested locally; manifest follows the official documented schemas; `forge lint` is run locally where possible.
- **Rovo needs a paid plan** (Standard/Premium trial includes it) on the dev site — the agent cannot be chat-tested on a free site. Mitigation: panels are the primary product; the agent is a bonus interface, and its actions are the same tested functions.
- **Competition:** 3,649 registered participants (Nov 16) across 33 paid places; the Best Agents bonus has 6 slots. The app's differentiator is a working, specific, demonstrable product — not a generic agent.
- **ReadyGate precedent:** a similar-idea entry (definition-of-ready checker) is already on Devpost — Sprint Doctor is sprint-level triage (staleness/blockers/load), a different problem; the plan avoids overlapping its feature set.
