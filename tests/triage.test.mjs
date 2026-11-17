/**
 * Tests for the Sprint Doctor triage engine (pure functions only).
 * Run with: npm test   (node --test)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreIssue, scoreSprint, renderBrief, THRESHOLDS } from '../src/lib/triage.js';
import { normalizeIssue, extractText, activeSprintJql } from '../src/lib/jira-adapter.js';
import { FIXTURE_ISSUES, FIXTURE_NOW, FIXTURE_SPRINT, RAW_JIRA_ISSUES } from '../src/lib/fixtures.js';

const ctxFor = (issues) => {
  const open = issues.filter((i) => i.statusCategory !== 'done');
  const load = new Map();
  for (const i of open) {
    if (i.assignee) load.set(i.assignee.accountId, (load.get(i.assignee.accountId) || 0) + 1);
  }
  return { now: FIXTURE_NOW, assigneeLoad: load, sprintStart: FIXTURE_SPRINT.start };
};

describe('scoreIssue', () => {
  it('a healthy issue scores 100 with no findings', () => {
    const issue = FIXTURE_ISSUES.find((i) => i.key === 'SD-101');
    const r = scoreIssue(issue, ctxFor(FIXTURE_ISSUES));
    assert.equal(r.score, 100);
    assert.equal(r.level, 'healthy');
    assert.deepEqual(r.findings, []);
  });

  it('a blocked + very stale + stuck issue is critical and flagged blocked', () => {
    const issue = FIXTURE_ISSUES.find((i) => i.key === 'SD-102');
    const r = scoreIssue(issue, ctxFor(FIXTURE_ISSUES));
    assert.equal(r.blocked, true);
    assert.equal(r.level, 'blocked');
    assert.ok(r.score <= 40, `expected low score, got ${r.score}`);
    const codes = r.findings.map((f) => f.code);
    assert.ok(codes.includes('BLOCKED'));
    assert.ok(codes.includes('VERY_STALE'));
    assert.ok(codes.includes('STUCK_IN_STATUS'));
  });

  it('an unassigned, unestimated, undescribed issue collects all three findings', () => {
    const issue = FIXTURE_ISSUES.find((i) => i.key === 'SD-103');
    const r = scoreIssue(issue, ctxFor(FIXTURE_ISSUES));
    const codes = r.findings.map((f) => f.code);
    assert.ok(codes.includes('UNASSIGNED'));
    assert.ok(codes.includes('NO_ESTIMATE'));
    assert.ok(codes.includes('THIN_SPEC'));
    assert.ok(codes.includes('STALE'));
  });

  it('a done issue is never penalised for staleness or missing data', () => {
    const issue = FIXTURE_ISSUES.find((i) => i.key === 'SD-106');
    const r = scoreIssue(issue, ctxFor(FIXTURE_ISSUES));
    assert.equal(r.score, 100);
    assert.equal(r.level, 'healthy');
  });

  it('an overloaded assignee is flagged on their issues', () => {
    // Ana carries 5 open issues in the fixture sprint; threshold is >5,
    // so add a 6th open issue for Ana and re-check.
    const extra = {
      key: 'SD-999',
      summary: 'Extra issue for Ana',
      type: 'Task',
      status: 'To Do',
      statusCategory: 'new',
      description: 'A full description that is long enough to pass the thin-spec check.',
      updated: FIXTURE_NOW.toISOString(),
      created: FIXTURE_NOW.toISOString(),
      statusChanged: FIXTURE_NOW.toISOString(),
      duedate: null,
      estimate: 1,
      assignee: { accountId: 'ana', displayName: 'Ana' },
      blockedBy: [],
    };
    const issues = [...FIXTURE_ISSUES, extra];
    const r = scoreIssue(extra, ctxFor(issues));
    assert.ok(r.findings.some((f) => f.code === 'OVERLOADED'));
  });

  it('an issue added after sprint start is flagged as scope creep', () => {
    const issue = FIXTURE_ISSUES.find((i) => i.key === 'SD-105');
    const r = scoreIssue(issue, ctxFor(FIXTURE_ISSUES));
    assert.ok(r.findings.some((f) => f.code === 'SCOPE_CREEP'));
  });

  it('scores are deterministic: same input, same output', () => {
    const issue = FIXTURE_ISSUES.find((i) => i.key === 'SD-102');
    const a = scoreIssue(issue, ctxFor(FIXTURE_ISSUES));
    const b = scoreIssue(issue, ctxFor(FIXTURE_ISSUES));
    assert.deepEqual(a, b);
  });
});

describe('scoreSprint', () => {
  it('scores the fixture sprint and counts blocked/stale/at-risk', () => {
    const s = scoreSprint(FIXTURE_ISSUES, {
      now: FIXTURE_NOW,
      sprintStart: FIXTURE_SPRINT.start,
      sprintName: FIXTURE_SPRINT.name,
    });
    assert.equal(s.issueCount, 10);
    assert.equal(s.openCount, 8);
    assert.equal(s.doneCount, 2);
    assert.equal(s.blockedCount, 1);
    assert.ok(s.staleCount >= 2, `expected >=2 stale, got ${s.staleCount}`);
    assert.ok(s.atRiskCount >= 1, `expected >=1 at-risk, got ${s.atRiskCount}`);
    assert.ok(s.score >= 0 && s.score <= 100);
    // Worst issues first.
    assert.ok(s.results[0].score <= s.results[s.results.length - 1].score);
    // The blocked issue is the worst.
    assert.equal(s.results[0].key, 'SD-102');
  });

  it('an empty sprint scores 100 with no findings', () => {
    const s = scoreSprint([], { now: FIXTURE_NOW, sprintStart: null });
    assert.equal(s.score, 100);
    assert.equal(s.issueCount, 0);
    assert.deepEqual(s.results, []);
  });

  it('an all-done sprint scores 100', () => {
    const done = FIXTURE_ISSUES.filter((i) => i.statusCategory === 'done');
    const s = scoreSprint(done, { now: FIXTURE_NOW, sprintStart: null });
    assert.equal(s.score, 100);
    assert.equal(s.atRiskCount, 0);
  });

  it('renderBrief names the worst issues and never invents data', () => {
    const s = scoreSprint(FIXTURE_ISSUES, {
      now: FIXTURE_NOW,
      sprintStart: FIXTURE_SPRINT.start,
      sprintName: FIXTURE_SPRINT.name,
    });
    const brief = renderBrief(s);
    assert.ok(brief.includes('SD-102'));
    assert.ok(brief.includes('Blocked: 1'));
    assert.ok(brief.includes(String(s.score)));
  });
});

describe('jira-adapter', () => {
  it('normalizes a raw Jira issue: only the unresolved blocker counts', () => {
    const raw = RAW_JIRA_ISSUES[0];
    const n = normalizeIssue(raw);
    assert.equal(n.key, 'SD-102');
    // SD-108 is unresolved -> blocker; SD-106 is done -> not a blocker.
    assert.deepEqual(n.blockedBy, ['SD-108']);
    assert.equal(n.estimate, 8);
    assert.equal(n.assignee.displayName, 'Bao');
    assert.equal(n.description, 'Rotate the auth service to the new token format.');
    // Most recent status change: 2026-11-01 (newest history first).
    assert.equal(n.statusChanged, '2026-11-01T06:00:00.000+0700');
  });

  it('extractText handles ADF, plain strings, and junk', () => {
    assert.equal(extractText('plain text'), 'plain text');
    assert.equal(extractText(null), '');
    assert.equal(extractText(undefined), '');
    assert.equal(extractText({ type: 'doc', content: [] }), '');
    assert.equal(
      extractText({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }] }),
      'Hi',
    );
  });

  it('activeSprintJql builds a valid JQL string', () => {
    const jql = activeSprintJql('SD');
    assert.ok(jql.includes('project = SD'));
    assert.ok(jql.includes('sprint in openSprints()'));
  });
});
