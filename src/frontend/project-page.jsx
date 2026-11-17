/**
 * Sprint Doctor — sprint triage board component (used by the project
 * page view in src/frontend/index.jsx). UI Kit JSX for the Forge runtime.
 */
import React, { Fragment, useState, useEffect } from 'react';
import { Text, Heading, Lozenge, DynamicTable } from '@forge/react';
import { invoke } from '@forge/bridge';

const LEVEL_TONE = {
  healthy: 'success',
  watch: 'moved',
  'at-risk': 'inprogress',
  critical: 'removed',
  blocked: 'removed',
};

export const SprintBoard = ({ projectKey }) => {
  const [board, setBoard] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    invoke('getSprintBoard', { projectKey })
      .then(setBoard)
      .catch((e) => setError(String(e?.message || e)));
  }, [projectKey]);

  if (error) return <Text>{`Sprint Doctor could not load the sprint: ${error}`}</Text>;
  if (!board) return <Text>Checking the sprint's health…</Text>;

  const attention = board.results.filter((r) => r.level !== 'healthy');
  return (
    <Fragment>
      <Fragment>
        <Heading size="large">{`Sprint Doctor — ${board.sprintName}`}</Heading>
        <Text>
          {`Sprint health: ${board.score}/100 (${board.level}) — ${board.openCount} open, ${board.doneCount} done, ${board.blockedCount} blocked, ${board.staleCount} stale, ${board.atRiskCount} at risk.`}
        </Text>
        {board.overloadedAssignees.map((p) => (
          <Text key={p.accountId}>{`Overloaded: ${p.displayName} carries ${p.openIssues} open issues.`}</Text>
        ))}
      </Fragment>
      <Fragment>
        <Heading size="medium">Needs attention</Heading>
        {attention.length === 0 ? (
          <Text>No issues need attention. The sprint looks healthy.</Text>
        ) : (
          <DynamicTable
            head={{
              cells: [
                { key: 'issue', content: 'Issue' },
                { key: 'score', content: 'Score' },
                { key: 'level', content: 'Level' },
                { key: 'finding', content: 'Top finding' },
              ],
            }}
            rows={attention.map((r) => ({
              key: r.key,
              cells: [
                { key: 'issue', content: `${r.key} — ${r.summary}` },
                { key: 'score', content: `${r.score}/100` },
                {
                  key: 'level',
                  content: <Lozenge text={r.level} appearance={LEVEL_TONE[r.level] || 'default'} />,
                },
                { key: 'finding', content: r.findings[0]?.message || '' },
              ],
            }))}
          />
        )}
      </Fragment>
      <Fragment>
        <Text>
          Scores come from live Jira data: blocked links, days since the last update, time in one status, estimates, descriptions, assignees and due dates. Ask Sprint Doctor in Rovo chat for the same triage in words.
        </Text>
      </Fragment>
    </Fragment>
  );
};
