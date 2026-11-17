/**
 * Fixture sprint — realistic Jira data used by the local tests and the
 * demo harness. These are INVENTED issues for a fictional project "SD"
 * (Sprint Doctor demo), clearly labelled DEMO everywhere they are shown.
 * They are NOT real Jira data and are never presented as such.
 *
 * Reference date for the fixtures: 2026-11-17. All relative ages below
 * are computed from that date so the demo output is stable.
 */

export const FIXTURE_NOW = new Date('2026-11-17T06:00:00.000Z');
export const FIXTURE_SPRINT = {
  name: 'SD Sprint 12',
  start: new Date('2026-11-03T00:00:00.000Z'),
};

const daysAgo = (n) => new Date(FIXTURE_NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
const daysAgoDate = (n) =>
  new Date(FIXTURE_NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** Normalized issues (the shape jira-adapter.js produces). */
export const FIXTURE_ISSUES = [
  {
    key: 'SD-101',
    summary: 'Checkout fails when cart has more than 10 items',
    type: 'Bug',
    status: 'In Progress',
    statusCategory: 'indeterminate',
    description:
      'Repro: add 11 items to the cart and submit checkout. The payment service returns 500. Expected: checkout succeeds or shows a clear error. See attached logs.',
    updated: daysAgo(1),
    created: daysAgo(16),
    statusChanged: daysAgo(1),
    duedate: daysAgoDate(-2),
    estimate: 5,
    assignee: { accountId: 'ana', displayName: 'Ana' },
    blockedBy: [],
  },
  {
    key: 'SD-102',
    summary: 'Migrate auth service to new tokens',
    type: 'Task',
    status: 'In Progress',
    statusCategory: 'indeterminate',
    description: 'Rotate the auth service to the new token format before the old one expires.',
    updated: daysAgo(16),
    created: daysAgo(20),
    statusChanged: daysAgo(16),
    duedate: null,
    estimate: 8,
    assignee: { accountId: 'bao', displayName: 'Bao' },
    blockedBy: ['SD-108'],
  },
  {
    key: 'SD-103',
    summary: 'Add export to CSV on reports page',
    type: 'Story',
    status: 'To Do',
    statusCategory: 'new',
    description: '',
    updated: daysAgo(9),
    created: daysAgo(11),
    statusChanged: daysAgo(11),
    duedate: null,
    estimate: null,
    assignee: null,
    blockedBy: [],
  },
  {
    key: 'SD-104',
    summary: 'Fix flaky login test',
    type: 'Task',
    status: 'In Review',
    statusCategory: 'indeterminate',
    description: 'The login test fails about one run in five on CI. Investigate the race in the session setup.',
    updated: daysAgo(2),
    created: daysAgo(13),
    statusChanged: daysAgo(6),
    duedate: null,
    estimate: 2,
    assignee: { accountId: 'ana', displayName: 'Ana' },
    blockedBy: [],
  },
  {
    key: 'SD-105',
    summary: 'Dark mode for settings page',
    type: 'Story',
    status: 'To Do',
    statusCategory: 'new',
    description: 'Add a dark theme toggle to the settings page, following the design tokens.',
    updated: daysAgo(3),
    created: daysAgo(4),
    statusChanged: daysAgo(4),
    duedate: null,
    estimate: 3,
    assignee: { accountId: 'ana', displayName: 'Ana' },
    blockedBy: [],
  },
  {
    key: 'SD-106',
    summary: 'Update onboarding docs',
    type: 'Task',
    status: 'Done',
    statusCategory: 'done',
    description: 'Refresh the onboarding guide with the new repo layout.',
    updated: daysAgo(1),
    created: daysAgo(10),
    statusChanged: daysAgo(1),
    duedate: null,
    estimate: 1,
    assignee: { accountId: 'minh', displayName: 'Minh' },
    blockedBy: [],
  },
  {
    key: 'SD-107',
    summary: 'API rate limit headers',
    type: 'Story',
    status: 'In Progress',
    statusCategory: 'indeterminate',
    description: 'Return X-RateLimit headers on every API response.',
    updated: daysAgo(0),
    created: daysAgo(8),
    statusChanged: daysAgo(0),
    duedate: null,
    estimate: 3,
    assignee: { accountId: 'ana', displayName: 'Ana' },
    blockedBy: [],
  },
  {
    key: 'SD-108',
    summary: 'Provision new token signing key',
    type: 'Task',
    status: 'To Do',
    statusCategory: 'new',
    description: 'Create and distribute the new signing key for the token service.',
    updated: daysAgo(12),
    created: daysAgo(15),
    statusChanged: daysAgo(15),
    duedate: daysAgoDate(5),
    estimate: null,
    assignee: { accountId: 'bao', displayName: 'Bao' },
    blockedBy: [],
  },
  {
    key: 'SD-109',
    summary: 'Improve search relevance',
    type: 'Story',
    status: 'In Progress',
    statusCategory: 'indeterminate',
    description: 'Tune the search ranking so exact title matches come first.',
    updated: daysAgo(1),
    created: daysAgo(9),
    statusChanged: daysAgo(3),
    duedate: null,
    estimate: 5,
    assignee: { accountId: 'ana', displayName: 'Ana' },
    blockedBy: [],
  },
  {
    key: 'SD-110',
    summary: 'Fix typo in footer',
    type: 'Task',
    status: 'Done',
    statusCategory: 'done',
    description: 'Footer says "copright".',
    updated: daysAgo(2),
    created: daysAgo(6),
    statusChanged: daysAgo(2),
    duedate: null,
    estimate: 1,
    assignee: { accountId: 'minh', displayName: 'Minh' },
    blockedBy: [],
  },
];

/** Raw Jira API payloads for two issues, used to test the adapter. */
export const RAW_JIRA_ISSUES = [
  {
    key: 'SD-102',
    fields: {
      summary: 'Migrate auth service to new tokens',
      issuetype: { name: 'Task' },
      status: { name: 'In Progress', statusCategory: { key: 'indeterminate' } },
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Rotate the auth service to the new token format.' }],
          },
        ],
      },
      updated: '2026-11-01T06:00:00.000+0700',
      created: '2026-10-28T06:00:00.000+0700',
      duedate: null,
      customfield_10016: 8,
      assignee: { accountId: 'bao', displayName: 'Bao' },
      issuelinks: [
        {
          type: { inward: 'is blocked by', outward: 'blocks' },
          inwardIssue: {
            key: 'SD-108',
            fields: { status: { statusCategory: { key: 'new' } } },
          },
        },
        {
          type: { inward: 'is blocked by', outward: 'blocks' },
          inwardIssue: {
            key: 'SD-106',
            fields: { status: { statusCategory: { key: 'done' } } },
          },
        },
      ],
    },
    changelog: {
      histories: [
        {
          created: '2026-11-01T06:00:00.000+0700',
          items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }],
        },
        {
          created: '2026-10-28T06:00:00.000+0700',
          items: [{ field: 'summary', fromString: '', toString: 'Migrate auth service' }],
        },
      ],
    },
  },
];
