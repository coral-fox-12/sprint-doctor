---
name: sprint-triage
description: Run a full triage of the active Jira sprint — health, blocked and stale issues, overloaded people — and compose the triage brief.
---

# Sprint Triage

A playbook for running a full triage of the active Jira sprint. Use it
when the user asks for a triage brief, a sprint review, or "what needs
attention".

## When to use

- User asks for the sprint triage brief, sprint health, or what is
  blocking/stale/at risk in the sprint.
- Do NOT use for single-issue questions — answer those from the
  relevant action directly.

## Workflow

1. Call `get-sprint-health` with the project key (ask the user for it
   if it is not clear from the conversation).
2. If the sprint has blocked issues, call `get-blocked-issues` to get
   the blocking issue keys for each one.
3. If the sprint has stale issues, call `get-stale-issues` to confirm
   the exact list.
4. Compose the brief in this order:
   - Verdict line: sprint score / 100, level, open vs done counts.
   - Blocked: each blocked issue key + its blocking issue key.
   - Stale: each stale issue key + days since last update.
   - Overloaded people: name + open-issue count.
   - Top 3 next actions, most urgent first.
5. End with one question: "Want me to post this brief as a comment
   on any issue?" Do NOT post anything unless the user says yes and
   names the issue — then use `post-triage-comment` with the exact
   brief text they approved.

## Allowed tools

- get-sprint-health
- get-blocked-issues
- get-stale-issues
- post-triage-comment (only after explicit user confirmation)

## Guardrails

- Every number and issue key in the brief must come from the action
  results. If an action returns an empty list, say "none" — do not
  invent an example.
- If the project key is unknown, ask for it instead of guessing.
