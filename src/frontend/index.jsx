/**
 * Sprint Doctor — frontend entry (UI Kit, render: native).
 *
 * One entry serves both Forge modules declared in manifest.yml:
 *  - jira:issuePanel  -> extension.issue is present: per-issue health card.
 *  - jira:projectPage -> extension.project is present: sprint triage board.
 * Data comes from the Forge resolver (src/index.js), which reads live
 * Jira data. The scoring engine is src/lib/triage.js (pure, tested).
 *
 * This file is UI Kit JSX for the Forge runtime. It is not executed by
 * the local tests; it is validated by `forge lint` / `forge deploy`
 * (parent step: Atlassian account).
 */
import ForgeUI, { render, Fragment, Text, Section, Heading, Lozenge, useProductContext, useState, useEffect } from '@forge/react';
import { invoke } from '@forge/bridge';
import { SprintBoard } from './project-page.jsx';

const LEVEL_TONE = {
  healthy: 'success',
  watch: 'moved',
  'at-risk': 'inprogress',
  critical: 'removed',
  blocked: 'removed',
};

const IssueCard = ({ issueKey, projectKey }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    invoke('getIssueHealth', { issueKey, projectKey })
      .then(setData)
      .catch((e) => setError(String(e?.message || e)));
  }, [issueKey]);

  if (error) return <Text>{`Sprint Doctor could not load this issue: ${error}`}</Text>;
  if (!data) return <Text>Checking this issue's health…</Text>;
  if (data.error) return <Text>{data.error}</Text>;

  const { issue } = data;
  return (
    <Fragment>
      <Section>
        <Heading size="medium">
          {`Sprint Doctor — ${issue.key}: ${issue.score}/100 (${issue.level})`}
        </Heading>
        <Lozenge text={issue.level} appearance={LEVEL_TONE[issue.level] || 'default'} />
        <Text>{`Sprint health overall: ${data.sprintScore}/100 (${data.sprintLevel}).`}</Text>
      </Section>
      <Section>
        <Heading size="small">Findings</Heading>
        {issue.findings.length === 0 ? (
          <Text>No issues found. This issue looks healthy.</Text>
        ) : (
          issue.findings.map((f) => (
            <Fragment key={f.code}>
              <Text>{`• [${f.severity}] ${f.message}`}</Text>
              <Text>{`  Next step: ${f.suggestion}`}</Text>
            </Fragment>
          ))
        )}
      </Section>
    </Fragment>
  );
};

const App = () => {
  const { extension } = useProductContext();
  const issueKey = extension?.issue?.key;
  const projectKey = extension?.project?.key || (issueKey ? issueKey.split('-')[0] : null);

  if (issueKey) return <IssueCard issueKey={issueKey} projectKey={projectKey} />;
  if (projectKey) return <SprintBoard projectKey={projectKey} />;
  return <Text>Sprint Doctor needs a Jira issue or project context to run.</Text>;
};

export const run = render(<App />);
