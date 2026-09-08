import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';

// =============================================================================
// The release gate, as a property of the workflow file
// -----------------------------------------------------------------------------
// At 521e64f the site deployed while CI was failing formatting and the bundle
// budget. It could, because Pages was serving the branch: GitHub published the
// commit and nothing consulted CI at all.
//
// The repair is a deploy job that depends on the CI gate, and these assert the
// properties that make it a gate rather than a decoration. They are checks on
// YAML, which is unusual, and they earn their place because the failure they
// guard against is invisible in review: `if: always()` or an extra entry in
// `needs` would look like a small edit and would silently restore publishing
// from a failed run.
// =============================================================================

let workflow;
let deploy;
let gate;

beforeAll(() => {
  workflow = yaml.load(readFileSync('.github/workflows/ci.yml', 'utf8'));
  deploy = workflow.jobs.deploy;
  gate = workflow.jobs.ci;
});

describe('the deploy job only runs behind the gate', () => {
  test('it depends on the aggregate CI job and on nothing else', () => {
    expect(deploy.needs).toEqual(['ci']);
  });

  test('it has no always() or failure() escape hatch', () => {
    // The single most important line in the file. With `always()` a failed CI
    // run would deploy anyway, which is precisely the incident.
    const condition = String(deploy.if || '');
    expect(condition).not.toMatch(/always\s*\(/);
    expect(condition).not.toMatch(/failure\s*\(/);
    expect(condition).not.toMatch(/cancelled\s*\(/);
    // Nor may any of its steps reintroduce one.
    for (const step of deploy.steps) {
      expect(String(step.if || '')).not.toMatch(/always\s*\(/);
    }
  });

  test('it runs only for a push to main', () => {
    expect(deploy.if).toContain("github.event_name == 'push'");
    expect(deploy.if).toContain("github.ref == 'refs/heads/main'");
  });

  test('the gate it depends on treats anything but success as failure', () => {
    // `needs` alone is not enough: the ci job runs with always() so that it can
    // report, so it must fail the run itself when a dependency did not pass.
    const script = gate.steps.map(s => s.run || '').join('\n');
    expect(script).toMatch(/success\|skipped/);
    expect(script).toMatch(/exit 1/);
  });

  test('every job the gate aggregates is actually listed', () => {
    // A new job that nobody added to `needs` would be a check that cannot
    // block a deploy, which is worse than not having it.
    //
    // e2e-report is the one deliberate exception and it is named here rather
    // than skipped quietly: it exists to publish a report when the shards
    // fail, so requiring it would mean a failed suite could not produce its
    // own diagnostics, and it decides nothing.
    const REPORTING_ONLY = new Set(['e2e-report']);
    const aggregated = new Set(gate.needs);
    for (const name of Object.keys(workflow.jobs)) {
      if (name === 'ci' || name === 'deploy') continue;
      if (REPORTING_ONLY.has(name)) {
        expect(aggregated.has(name)).toBe(false);
        continue;
      }
      expect(aggregated.has(name)).toBe(true);
    }
  });

  test('the source suite is sharded and every shard has to pass', () => {
    const e2e = workflow.jobs.e2e;
    // Six shards, so the suite fits inside the job limit it kept exceeding
    // with room to spare rather than by twelve seconds.
    expect(e2e.strategy.matrix.shard).toEqual([1, 2, 3, 4, 5, 6]);
    // One failing shard must not cancel the others: a cancelled shard says
    // nothing about the tests it never reached.
    expect(e2e.strategy['fail-fast']).toBe(false);
    // Two workers per runner, as before. The parallelism belongs across
    // runners; more workers on one make every test in this suite slower.
    const run = e2e.steps.map(st => st.run || '').join('\n');
    expect(run).toMatch(/--shard=\$\{\{ matrix\.shard \}\}\/6/);
    expect(run).not.toMatch(/--workers/);
    // And the gate requires the matrix as a whole, which GitHub rolls up to
    // success only when every shard succeeded.
    expect(gate.needs).toContain('e2e');
  });

  test('a shard that produces no report is not a shard that passed', () => {
    const e2e = workflow.jobs.e2e;
    const upload = e2e.steps.find(st =>
      (st.name || '').includes("Upload this shard's blob report")
    );
    // Missing blobs fail the upload rather than being shrugged off, and the
    // step runs even when the tests failed - which is when it matters.
    expect(upload.with['if-no-files-found']).toBe('error');
    expect(String(upload.if)).toContain('!cancelled()');
    // The step running the tests is capped below the job, so an overrunning
    // shard is killed with time left to upload what it has.
    const runStep = e2e.steps.find(st => (st.run || '').includes('--shard='));
    expect(runStep['timeout-minutes']).toBeLessThan(e2e['timeout-minutes']);
  });

  test('the shards report into one mergeable HTML report', () => {
    const report = workflow.jobs['e2e-report'];
    expect(report.needs).toContain('e2e');
    // It runs whether the shards passed or not, because a report is most
    // wanted when they did not.
    expect(String(report.if)).toContain('!cancelled()');
    const run = report.steps.map(st => st.run || '').join('\n');
    expect(run).toMatch(/merge-reports --reporter html/);
    const download = report.steps.find(st =>
      (st.uses || '').includes('download-artifact')
    );
    expect(download.with.pattern).toBe('blob-report-sources-*');
  });

  test('each shard uploads under its own name', () => {
    // Four artifacts with one name is one artifact, and three quarters of the
    // run is then missing from the merge.
    const names = workflow.jobs.e2e.steps
      .filter(st => (st.uses || '').includes('upload-artifact'))
      .map(st => st.with.name);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name).toContain('${{ matrix.shard }}');
    }
  });
});

describe('what the deploy job publishes', () => {
  const step = name => deploy.steps.find(s => (s.name || '').includes(name));

  test('it checks out the exact commit the run validated', () => {
    const checkout = deploy.steps.find(s =>
      (s.uses || '').includes('checkout')
    );
    expect(checkout.with.ref).toBe('${{ github.sha }}');
  });

  test('it publishes a staging copy of the root, not dist/ and not the checkout', () => {
    // The site is served unbundled from the root and the service worker
    // precaches root paths by name. Publishing dist/ would be a different
    // site.
    //
    // It is a staging copy rather than the checkout itself because the deploy
    // has four files to write - three stamped pages and the re-sealed manifest
    // - and the guard that follows refused exactly those four when they were
    // written in place. _site holds the validated commit plus those four and
    // nothing else; tools/prepare-pages.mjs assembles it and checks that.
    const upload = deploy.steps.find(s =>
      (s.uses || '').includes('upload-pages-artifact')
    );
    expect(upload.with.path).toBe('_site');
    const prepare = deploy.steps.find(s =>
      (s.run || '').includes('prepare-pages.mjs')
    );
    expect(prepare).toBeTruthy();
    expect(prepare.run).toMatch(/--out _site/);
  });

  test('it never runs a build, because a build rewrites the instructor bundle', () => {
    // Comments stripped: one of them explains why there is no npm install, and
    // matching against the explanation rather than the commands would be a
    // test of the prose.
    const script = deploy.steps
      .map(s => s.run || '')
      .join('\n')
      .split('\n')
      .filter(line => !line.trim().startsWith('#'))
      .join('\n');
    expect(script).not.toMatch(/npm (ci|install)/);
    expect(script).not.toMatch(/npm run build/);
    expect(script).not.toMatch(/build:ci/);
  });

  test('it verifies the tree before uploading', () => {
    // The verifier runs inside tools/prepare-pages.mjs now, along with the
    // rest of the sequence, so what the workflow has to get right is that the
    // preparation happens before the upload.
    const order = deploy.steps.map(s => `${s.name || ''} ${s.uses || ''}`);
    const uploadAt = order.findIndex(n => n.includes('upload-pages-artifact'));
    const prepareAt = deploy.steps.findIndex(s =>
      (s.run || '').includes('prepare-pages.mjs')
    );
    expect(uploadAt).toBeGreaterThan(-1);
    expect(prepareAt).toBeGreaterThan(-1);
    expect(prepareAt).toBeLessThan(uploadAt);
    const tool = readFileSync(
      new URL('../tools/prepare-pages.mjs', import.meta.url),
      'utf8'
    );
    expect(tool).toMatch(/verifyRelease\(out\)/);
  });

  test('it fails if anything modified the checkout', () => {
    // The backstop behind the verifier: if some future step regenerated a
    // tracked file, this notices even if the verifier's rules do not cover it.
    const confirm = step('unmodified');
    expect(confirm.run).toMatch(/git status --porcelain/);
    expect(confirm.run).toMatch(/exit 1/);
  });
});

describe('the four ways it declines to publish', () => {
  test('a superseded commit is detected and skipped, not failed', () => {
    const supersede = deploy.steps.find(s =>
      (s.name || '').includes('superseded')
    );
    expect(supersede.run).toMatch(/git ls-remote origin refs\/heads\/main/);
    // A notice and an output, not a non-zero exit: being overtaken is a normal
    // outcome and should not paint the run red.
    expect(supersede.run).toMatch(/::notice::/);
    expect(supersede.run).not.toMatch(/exit 1/);
    expect(supersede.run).toMatch(/superseded=true/);
  });

  test('every publishing step is guarded by that check', () => {
    const guarded = deploy.steps.filter(
      s => String(s.if || '') === "steps.tip.outputs.superseded == 'false'"
    );
    // Everything after the check except the checkout, the check itself, and
    // the message that explains a skipped deploy.
    expect(guarded.length).toBe(deploy.steps.length - 3);
    for (const s of ['upload-pages-artifact', 'deploy-pages']) {
      const found = deploy.steps.find(x => (x.uses || '').includes(s));
      expect(found.if).toBe("steps.tip.outputs.superseded == 'false'");
    }
  });

  test('deployments queue rather than cancelling each other', () => {
    // A cancelled deploy leaves the live site indeterminate, which is worse
    // than waiting.
    expect(deploy.concurrency.group).toBe('pages-deploy');
    expect(deploy.concurrency['cancel-in-progress']).toBe(false);
  });
});

describe('permissions', () => {
  test('the workflow is read-only and only the deploy job widens that', () => {
    expect(workflow.permissions).toEqual({ contents: 'read' });
    expect(deploy.permissions).toEqual({
      contents: 'read',
      pages: 'write',
      'id-token': 'write',
    });
    for (const [name, job] of Object.entries(workflow.jobs)) {
      if (name === 'deploy') continue;
      expect(job.permissions?.pages).toBeUndefined();
    }
  });

  test('it declares the github-pages environment, so the deploy is attributable', () => {
    expect(deploy.environment.name).toBe('github-pages');
    expect(deploy.environment.url).toMatch(/page_url/);
  });
});

describe('diagnosability', () => {
  test('the deployed revision is written into the site', () => {
    // Written by the preparation step, into the staging tree, from the same
    // commit the pages are stamped with - which is checked there rather than
    // asserted here.
    const prepare = deploy.steps.find(s =>
      (s.run || '').includes('prepare-pages.mjs')
    );
    expect(prepare.run).toMatch(/deployed-revision\.json/);
    expect(prepare.run).toMatch(/github\.sha/);
    expect(prepare.run).toMatch(/--run-id/);
    const tool = readFileSync(
      new URL('../tools/prepare-pages.mjs', import.meta.url),
      'utf8'
    );
    expect(tool).toMatch(/deployed-revision\.json/);
    expect(tool).toMatch(/runId/);
  });

  test('the run summary names the commit and the URL', () => {
    const say = deploy.steps.find(s =>
      (s.name || '').includes('what went live')
    );
    expect(say.run).toMatch(/GITHUB_STEP_SUMMARY/);
    expect(say.run).toMatch(/github\.sha/);
    expect(say.run).toMatch(/page_url/);
  });
});
