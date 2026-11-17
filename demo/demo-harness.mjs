/**
 * Sprint Doctor — local demo harness.
 *
 * Runs the triage engine on the fixture sprint (INVENTED demo data for
 * fictional project "SD") and prints the same sprint brief the Forge app
 * produces on live Jira data. Every output is labelled DEMO.
 *
 * Run with: node demo/demo-harness.mjs
 */
import { scoreSprint, renderBrief } from '../src/lib/triage.js';
import { FIXTURE_ISSUES, FIXTURE_NOW, FIXTURE_SPRINT } from '../src/lib/fixtures.js';

const sprint = scoreSprint(FIXTURE_ISSUES, {
  now: FIXTURE_NOW,
  sprintStart: FIXTURE_SPRINT.start,
  sprintName: FIXTURE_SPRINT.name,
});

console.log('=== DEMO DATA — invented fixture sprint, NOT real Jira data ===');
console.log(renderBrief(sprint));
console.log('');
console.log('Per-issue scores (worst first):');
for (const r of sprint.results) {
  console.log(`  ${r.key}  ${String(r.score).padStart(3)}/100  ${r.level.padEnd(8)}  ${r.summary}`);
  for (const f of r.findings) {
    console.log(`      [${f.severity}] ${f.code}: ${f.message}`);
    console.log(`      -> ${f.suggestion}`);
  }
}
