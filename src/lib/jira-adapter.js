/**
 * Jira adapter — maps Jira REST API issue objects to the normalized
 * shape the triage engine consumes. Pure functions (no Forge imports),
 * so the mapping is testable with fixture payloads.
 *
 * Normalized issue:
 * {
 *   key, summary, type, status, statusCategory ('new'|'indeterminate'|'done'),
 *   description, updated, created, statusChanged, duedate, estimate,
 *   assignee: { accountId, displayName } | null,
 *   blockedBy: [issueKey, ...]   // keys of unresolved blockers
 * }
 */

/**
 * Normalize one Jira issue (as returned by /rest/api/3/search or the
 * Agile board issue endpoint) into the engine's input shape.
 * @param {Object} jiraIssue - raw Jira issue JSON
 * @returns {Object} normalized issue
 */
export function normalizeIssue(jiraIssue) {
  const f = jiraIssue.fields || {};

  // "is blocked by" links: outward links of type "Blocks" mean THIS issue
  // blocks the other one; inward "is blocked by" links are the blockers.
  const blockedBy = [];
  for (const link of f.issuelinks || []) {
    if (link.type && link.type.inward === 'is blocked by' && link.inwardIssue) {
      const blocker = link.inwardIssue;
      const blockerDone =
        blocker.fields && blocker.fields.status && blocker.fields.status.statusCategory
          ? blocker.fields.status.statusCategory.key === 'done'
          : false;
      if (!blockerDone) blockedBy.push(blocker.key);
    }
    // Some instances use the outward "Blocks" direction on the blocker side;
    // a link with outwardIssue + type "Blocks" on THIS issue means this issue
    // IS the blocker, not blocked — ignore it here.
  }

  // Status change time: the most recent status change. Changelog histories
  // come newest-first, so the FIRST history with a status item is the
  // most recent change into the current status.
  let statusChanged = null;
  if (Array.isArray(jiraIssue.changelog?.histories)) {
    for (const h of jiraIssue.changelog.histories) {
      if ((h.items || []).some((it) => it.field === 'status')) {
        statusChanged = h.created;
        break;
      }
    }
  }

  // Estimate: story points (customfield_10016 is the standard Jira Cloud
  // field) or remaining time estimate in seconds.
  const estimate =
    f.customfield_10016 ?? f.timeestimate ?? f.estimate ?? null;

  return {
    key: jiraIssue.key,
    summary: f.summary || '',
    type: f.issuetype?.name || 'Task',
    status: f.status?.name || 'Unknown',
    statusCategory: f.status?.statusCategory?.key || 'indeterminate',
    description: extractText(f.description),
    updated: f.updated || null,
    created: f.created || null,
    statusChanged,
    duedate: f.duedate || null,
    estimate: typeof estimate === 'number' ? estimate : null,
    assignee: f.assignee
      ? { accountId: f.assignee.accountId, displayName: f.assignee.displayName }
      : null,
    blockedBy,
  };
}

/**
 * Jira Cloud descriptions are Atlassian Document Format (ADF) objects.
 * Extract plain text for length checks; return '' for anything unknown.
 */
export function extractText(description) {
  if (!description) return '';
  if (typeof description === 'string') return description;
  if (typeof description !== 'object' || !Array.isArray(description.content)) return '';
  const walk = (node) => {
    let out = '';
    if (node.type === 'text') out += node.text || '';
    if (Array.isArray(node.content)) {
      for (const child of node.content) out += walk(child) + ' ';
    }
    return out;
  };
  return walk(description).replace(/\s+/g, ' ').trim();
}

/**
 * JQL for "all issues in the active sprint of a project".
 * The Forge function uses this with the Agile board API when a board id
 * is known; otherwise it falls back to this JQL search.
 */
export function activeSprintJql(projectKey) {
  return `project = ${projectKey} AND sprint in openSprints() ORDER BY rank ASC`;
}
