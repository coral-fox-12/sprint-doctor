/**
 * Sprint Doctor — Forge entry point.
 *
 * Two kinds of handlers live here:
 *  1. Rovo `action` handlers (getSprintHealth, getBlockedIssues,
 *     getStaleIssues, postTriageComment) — called by the Rovo agent and
 *     exposed as MCP tools. They read live Jira data via @forge/api.
 *  2. The UI Kit `resolver` — called by the issue panel and project page
 *     frontends to fetch the same data.
 *
 * The scoring itself lives in src/lib/triage.js (pure, tested). This file
 * only fetches Jira data, normalizes it, and calls the engine — so the
 * behavior you see in the local demo harness is exactly the behavior the
 * Forge app produces on live data.
 *
 * NOTE: @forge/api and @forge/resolver are Forge-runtime packages. This
 * file is NOT executed by the local tests or demo harness (they import
 * only src/lib/*). It is validated by `forge lint` once the Forge CLI is
 * available (parent step: Atlassian account + forge login).
 */

import api, { route } from '@forge/api';
import Resolver from '@forge/resolver';
import { normalizeIssue, activeSprintJql } from './lib/jira-adapter.js';
import { scoreSprint, renderBrief } from './lib/triage.js';

/**
 * Fetch the issues of the active sprint for a project.
 * Prefers the Agile board API; falls back to JQL search.
 * Returns normalized issues.
 */
async function fetchActiveSprintIssues(projectKey) {
  // Try the Agile API first: find boards for the project, then the active sprint.
  try {
    const boardsRes = await api.asUser().requestJira(
      route`/rest/agile/1.0/board?projectKeyOrId=${projectKey}&type=scrum`,
    );
    const boards = (await boardsRes.json()).values || [];
    for (const board of boards) {
      const sprintsRes = await api.asUser().requestJira(
        route`/rest/agile/1.0/board/${board.id}/sprint?state=active`,
      );
      const sprints = (await sprintsRes.json()).values || [];
      for (const sprint of sprints) {
        const issuesRes = await api.asUser().requestJira(
          route`/rest/agile/1.0/board/${board.id}/sprint/${sprint.id}/issue?fields=summary,issuetype,status,description,updated,created,duedate,customfield_10016,timeestimate,assignee,issuelinks&expand=changelog&maxResults=100`,
        );
        const data = await issuesRes.json();
        return {
          sprintName: sprint.name,
          sprintStart: sprint.startDate ? new Date(sprint.startDate) : null,
          issues: (data.issues || []).map(normalizeIssue),
        };
      }
    }
  } catch (e) {
    console.log(`Agile API path failed (${e.message}); falling back to JQL.`);
  }

  // Fallback: JQL search for issues in open sprints.
  const jql = activeSprintJql(projectKey);
  const res = await api.asUser().requestJira(
    route`/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,issuetype,status,description,updated,created,duedate,customfield_10016,timeestimate,assignee,issuelinks&expand=changelog&maxResults=100`,
  );
  const data = await res.json();
  return {
    sprintName: 'Active sprint',
    sprintStart: null,
    issues: (data.issues || []).map(normalizeIssue),
  };
}

async function getSprintHealthData(projectKey) {
  const { sprintName, sprintStart, issues } = await fetchActiveSprintIssues(projectKey);
  const sprint = scoreSprint(issues, { now: new Date(), sprintStart, sprintName });
  return { ...sprint, brief: renderBrief(sprint) };
}

// --- Rovo action handlers (payload = the action's declared inputs) ---

export async function getSprintHealth(payload) {
  const data = await getSprintHealthData(payload.projectKey);
  return JSON.stringify({
    sprint: data.sprintName,
    score: data.score,
    level: data.level,
    open: data.openCount,
    done: data.doneCount,
    blocked: data.blockedCount,
    stale: data.staleCount,
    atRisk: data.atRiskCount,
    brief: data.brief,
    issues: data.results,
  });
}

export async function getBlockedIssues(payload) {
  const data = await getSprintHealthData(payload.projectKey);
  const blocked = data.results.filter((r) => r.blocked);
  return JSON.stringify({ count: blocked.length, issues: blocked });
}

export async function getStaleIssues(payload) {
  const data = await getSprintHealthData(payload.projectKey);
  const stale = data.results.filter((r) =>
    r.findings.some((f) => f.code === 'STALE' || f.code === 'VERY_STALE'),
  );
  return JSON.stringify({ count: stale.length, issues: stale });
}

export async function postTriageComment(payload) {
  const res = await api.asUser().requestJira(
    route`/rest/api/3/issue/${payload.issueKey}/comment`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: `Sprint Doctor triage:\n${payload.summary}` }],
            },
          ],
        },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Posting the comment failed (${res.status}): ${text}`);
  }
  return `Posted the triage summary as a comment on ${payload.issueKey}.`;
}

// --- UI Kit resolver (issue panel + project page call these) ---

const resolver = new Resolver();

resolver.define('getIssueHealth', async (req) => {
  const { issueKey, projectKey } = req.payload;
  const data = await getSprintHealthData(projectKey);
  const issue = data.results.find((r) => r.key === issueKey);
  if (!issue) return { error: `Issue ${issueKey} is not in the active sprint.` };
  return { issue, sprintScore: data.score, sprintLevel: data.level };
});

resolver.define('getSprintBoard', async (req) => {
  const data = await getSprintHealthData(req.payload.projectKey);
  return data;
});

resolver.define('getProjectKey', async (req) => {
  // The panel context carries the project key; the frontend passes it in.
  return { projectKey: req.payload.projectKey };
});

export const handler = resolver.getDefinitions();
