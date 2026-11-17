/**
 * Sprint Doctor — triage engine (PURE, deterministic).
 *
 * Input: normalized issues (see jira-adapter.js) + a reference time.
 * Output: per-issue health scores with findings, and a sprint summary.
 *
 * No Forge imports, no network, no clock reads inside the scoring
 * functions (the caller passes `now`) — so the whole engine is unit
 * testable and its output is reproducible from the same input.
 */

// --- Tuning constants (documented, so judges can see the reasoning) ---
export const THRESHOLDS = {
  staleDays: 7, // untouched for 7+ days while open = stale
  veryStaleDays: 14, // 14+ days = worse
  stuckInStatusDays: 5, // same status for 5+ days = stuck
  thinDescriptionChars: 40, // description shorter than this = underspecified
  overloadOpenIssues: 5, // assignee with more than this many open sprint issues = overloaded
};

const PENALTIES = {
  blocked: 35,
  stale: 20,
  veryStale: 30,
  stuckInStatus: 15,
  noEstimate: 10,
  thinSpec: 15,
  unassigned: 10,
  overdue: 15,
  overloaded: 10,
  scopeCreep: 5,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a, b) {
  return (b - a) / DAY_MS;
}

function levelFor(score, blocked) {
  if (blocked) return 'blocked';
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'watch';
  if (score >= 40) return 'at-risk';
  return 'critical';
}

/**
 * Score one normalized issue.
 * @param {Object} issue - normalized issue from jira-adapter.js
 * @param {Object} ctx - { now: Date, assigneeLoad: Map<accountId, count>, sprintStart: Date|null }
 * @returns {{ key, score, level, blocked, findings: Array<{code, severity, message, suggestion}> }}
 */
export function scoreIssue(issue, ctx) {
  const { now, assigneeLoad, sprintStart } = ctx;
  const findings = [];
  let score = 100;
  let blocked = false;

  const add = (code, severity, penalty, message, suggestion) => {
    score -= penalty;
    findings.push({ code, severity, message, suggestion });
  };

  // 1. Blocked — the strongest signal. A blocked issue cannot move.
  if (issue.blockedBy && issue.blockedBy.length > 0) {
    blocked = true;
    add(
      'BLOCKED',
      'high',
      PENALTIES.blocked,
      `Blocked by ${issue.blockedBy.join(', ')} (unresolved).`,
      `Unblock ${issue.blockedBy[0]} first, or reassign this issue out of the sprint.`,
    );
  }

  // 2. Staleness — open but untouched.
  const updatedAgo = daysBetween(new Date(issue.updated), now);
  if (issue.statusCategory !== 'done' && updatedAgo >= THRESHOLDS.veryStaleDays) {
    add(
      'VERY_STALE',
      'high',
      PENALTIES.veryStale,
      `No update for ${Math.floor(updatedAgo)} days.`,
      'Ask the assignee for a status update, or move it back to the backlog.',
    );
  } else if (issue.statusCategory !== 'done' && updatedAgo >= THRESHOLDS.staleDays) {
    add(
      'STALE',
      'medium',
      PENALTIES.stale,
      `No update for ${Math.floor(updatedAgo)} days.`,
      'Check in with the assignee — it may be stuck silently.',
    );
  }

  // 3. Stuck in one status.
  if (issue.statusCategory !== 'done' && issue.statusChanged) {
    const inStatusFor = daysBetween(new Date(issue.statusChanged), now);
    if (inStatusFor >= THRESHOLDS.stuckInStatusDays) {
      add(
        'STUCK_IN_STATUS',
        'medium',
        PENALTIES.stuckInStatus,
        `In status "${issue.status}" for ${Math.floor(inStatusFor)} days.`,
        'Review what is needed to move it forward in the next stand-up.',
      );
    }
  }

  // 4. Missing estimate (story points or time estimate), except sub-tasks.
  if (issue.type !== 'Sub-task' && issue.statusCategory !== 'done' && issue.estimate == null) {
    add(
      'NO_ESTIMATE',
      'low',
      PENALTIES.noEstimate,
      'No story-point or time estimate.',
      'Add an estimate so the sprint load is visible.',
    );
  }

  // 5. Thin description = underspecified work.
  const descLen = (issue.description || '').trim().length;
  if (issue.statusCategory !== 'done' && descLen < THRESHOLDS.thinDescriptionChars) {
    add(
      'THIN_SPEC',
      'medium',
      PENALTIES.thinSpec,
      descLen === 0 ? 'No description at all.' : `Description is only ${descLen} characters.`,
      'Add acceptance criteria before anyone picks this up.',
    );
  }

  // 6. Unassigned.
  if (!issue.assignee && issue.statusCategory !== 'done') {
    add(
      'UNASSIGNED',
      'medium',
      PENALTIES.unassigned,
      'No assignee.',
      'Assign an owner, or move it out of the sprint.',
    );
  }

  // 7. Overdue.
  if (issue.duedate && issue.statusCategory !== 'done') {
    const due = new Date(issue.duedate);
    if (due < now) {
      add(
        'OVERDUE',
        'high',
        PENALTIES.overdue,
        `Due date ${issue.duedate} has passed.`,
        'Re-negotiate the due date or split the work.',
      );
    }
  }

  // 8. Assignee overload (sprint-level context).
  if (issue.assignee && assigneeLoad) {
    const load = assigneeLoad.get(issue.assignee.accountId) || 0;
    if (load > THRESHOLDS.overloadOpenIssues) {
      add(
        'OVERLOADED',
        'medium',
        PENALTIES.overloaded,
        `${issue.assignee.displayName} carries ${load} open issues in this sprint.`,
        'Redistribute at least one issue to another teammate.',
      );
    }
  }

  // 9. Scope creep — added after the sprint started.
  if (sprintStart && issue.created) {
    const created = new Date(issue.created);
    if (created > sprintStart && issue.statusCategory !== 'done') {
      add(
        'SCOPE_CREEP',
        'low',
        PENALTIES.scopeCreep,
        'Added to the sprint after it started.',
        'Confirm with the team that the added scope was agreed.',
      );
    }
  }

  score = Math.max(0, Math.min(100, score));
  return {
    key: issue.key,
    summary: issue.summary,
    status: issue.status,
    assignee: issue.assignee ? issue.assignee.displayName : null,
    score,
    level: levelFor(score, blocked),
    blocked,
    findings,
  };
}

/**
 * Score a whole sprint.
 * @param {Array<Object>} issues - normalized issues
 * @param {Object} opts - { now: Date, sprintStart: Date|null, sprintName?: string }
 * @returns {{ sprintName, issueCount, openCount, doneCount, score, level, blockedCount, staleCount, atRiskCount, overloadedAssignees, results }}
 */
export function scoreSprint(issues, opts) {
  const now = opts.now;
  const sprintStart = opts.sprintStart || null;

  const openIssues = issues.filter((i) => i.statusCategory !== 'done');
  const doneCount = issues.length - openIssues.length;

  // Assignee load across open issues only.
  const assigneeLoad = new Map();
  for (const issue of openIssues) {
    if (issue.assignee) {
      assigneeLoad.set(issue.assignee.accountId, (assigneeLoad.get(issue.assignee.accountId) || 0) + 1);
    }
  }

  const results = issues.map((issue) =>
    scoreIssue(issue, { now, assigneeLoad, sprintStart }),
  );

  const openResults = results.filter((r) => {
    const orig = issues.find((i) => i.key === r.key);
    return orig && orig.statusCategory !== 'done';
  });

  const avg = openResults.length
    ? Math.round(openResults.reduce((s, r) => s + r.score, 0) / openResults.length)
    : 100;

  const blockedCount = results.filter((r) => r.blocked).length;
  const staleCount = results.filter((r) =>
    r.findings.some((f) => f.code === 'STALE' || f.code === 'VERY_STALE'),
  ).length;
  const atRiskCount = results.filter((r) => r.level === 'at-risk' || r.level === 'critical').length;

  const overloadedAssignees = [];
  for (const [accountId, load] of assigneeLoad) {
    if (load > THRESHOLDS.overloadOpenIssues) {
      const name = openIssues.find((i) => i.assignee && i.assignee.accountId === accountId)?.assignee
        .displayName;
      overloadedAssignees.push({ accountId, displayName: name || accountId, openIssues: load });
    }
  }

  return {
    sprintName: opts.sprintName || 'Active sprint',
    issueCount: issues.length,
    openCount: openIssues.length,
    doneCount,
    score: avg,
    // Sprint level is score-based only; blocked/stale counts are reported
    // separately (a sprint is not itself "blocked" — its issues are).
    level: levelFor(avg, false),
    blockedCount,
    staleCount,
    atRiskCount,
    overloadedAssignees,
    results: results.sort((a, b) => a.score - b.score),
  };
}

/**
 * Render a short human-readable triage brief from a sprint score.
 * Used by the demo harness, the Rovo actions, and the project page.
 */
export function renderBrief(sprint) {
  const lines = [];
  lines.push(`Sprint Doctor — ${sprint.sprintName}`);
  lines.push(`Sprint health: ${sprint.score}/100 (${sprint.level}) — ${sprint.openCount} open, ${sprint.doneCount} done.`);
  if (sprint.blockedCount > 0) lines.push(`Blocked: ${sprint.blockedCount} issue(s).`);
  if (sprint.staleCount > 0) lines.push(`Stale (no update 7+ days): ${sprint.staleCount} issue(s).`);
  if (sprint.atRiskCount > 0) lines.push(`At risk or critical: ${sprint.atRiskCount} issue(s).`);
  for (const person of sprint.overloadedAssignees) {
    lines.push(`Overloaded: ${person.displayName} carries ${person.openIssues} open issues.`);
  }
  const worst = sprint.results.filter((r) => r.level !== 'healthy').slice(0, 5);
  for (const r of worst) {
    lines.push(`- ${r.key} (${r.score}/100, ${r.level}): ${r.findings[0]?.message || ''}`);
  }
  if (worst.length === 0) lines.push('No issues need attention. The sprint looks healthy.');
  return lines.join('\n');
}
