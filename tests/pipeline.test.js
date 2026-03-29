import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

// ─── Constants ─────────────────────────────────────────────────────────────

const ROOT = resolve(import.meta.dirname, '..');
const WORKFLOW_PATH = resolve(ROOT, '.github', 'workflows', 'pipeline.yml');

// ─── Helpers ───────────────────────────────────────────────────────────────

function loadWorkflow() {
  const raw = readFileSync(WORKFLOW_PATH, 'utf-8');
  return parse(raw);
}

// ─── T6.1 : YAML syntax and structure ──────────────────────────────────────

describe('pipeline.yml — YAML syntax and structure', () => {
  it('file exists at .github/workflows/pipeline.yml', () => {
    expect(existsSync(WORKFLOW_PATH)).toBe(true);
  });

  it('is valid YAML that parses without error', () => {
    const raw = readFileSync(WORKFLOW_PATH, 'utf-8');
    expect(() => parse(raw)).not.toThrow();
  });

  it('has a workflow name', () => {
    const wf = loadWorkflow();
    expect(wf.name).toBeTruthy();
  });

  it('has schedule trigger with cron for Mon/Tue/Wed', () => {
    const wf = loadWorkflow();
    expect(wf.on).toBeDefined();
    expect(wf.on.schedule).toBeDefined();
    expect(wf.on.schedule).toBeInstanceOf(Array);
    expect(wf.on.schedule.length).toBeGreaterThanOrEqual(1);

    const cron = wf.on.schedule[0].cron;
    expect(cron).toBeDefined();
    // Must include days 1,2,3 (Mon,Tue,Wed)
    expect(cron).toMatch(/1,2,3/);
  });

  it('has workflow_dispatch trigger for manual runs', () => {
    const wf = loadWorkflow();
    expect(wf.on.workflow_dispatch).toBeDefined();
  });

  it('has contents:write and issues:write permissions', () => {
    const wf = loadWorkflow();
    expect(wf.permissions).toBeDefined();
    expect(wf.permissions.contents).toBe('write');
    expect(wf.permissions.issues).toBe('write');
  });

  it('has a pipeline job', () => {
    const wf = loadWorkflow();
    expect(wf.jobs).toBeDefined();
    expect(wf.jobs.pipeline).toBeDefined();
  });

  it('runs on ubuntu-latest', () => {
    const wf = loadWorkflow();
    expect(wf.jobs.pipeline['runs-on']).toBe('ubuntu-latest');
  });
});

// ─── Sequential steps ──────────────────────────────────────────────────────

describe('pipeline.yml — sequential script execution', () => {
  let steps;

  function getStepNames() {
    if (!steps) {
      const wf = loadWorkflow();
      steps = wf.jobs.pipeline.steps;
    }
    return steps.map((s) => s.name);
  }

  function getStepByName(name) {
    const wf = loadWorkflow();
    return wf.jobs.pipeline.steps.find((s) => s.name === name);
  }

  it('has checkout, setup-node, npm ci steps', () => {
    const names = getStepNames();
    expect(names.some((n) => /checkout/i.test(n))).toBe(true);
    expect(names.some((n) => /node/i.test(n))).toBe(true);
    expect(names.some((n) => /install|dependencies/i.test(n))).toBe(true);
  });

  it('executes scrape.js', () => {
    const names = getStepNames();
    expect(names.some((n) => /scrape/i.test(n))).toBe(true);
  });

  it('executes validate.js after scrape', () => {
    const names = getStepNames();
    const scrapeIdx = names.findIndex((n) => /scrape lnr/i.test(n));
    const validateIdx = names.findIndex((n) => /validate/i.test(n));
    expect(validateIdx).toBeGreaterThan(scrapeIdx);
  });

  it('executes elo.js after validate', () => {
    const names = getStepNames();
    const validateIdx = names.findIndex((n) => /validate/i.test(n));
    const eloIdx = names.findIndex((n) => /elo/i.test(n));
    expect(eloIdx).toBeGreaterThan(validateIdx);
  });

  it('executes generate.js after elo', () => {
    const names = getStepNames();
    const eloIdx = names.findIndex((n) => /elo/i.test(n));
    const generateIdx = names.findIndex((n) => /generate/i.test(n));
    expect(generateIdx).toBeGreaterThan(eloIdx);
  });

  it('each pipeline script step uses node scripts/<name>.js', () => {
    const wf = loadWorkflow();
    const pipelineSteps = wf.jobs.pipeline.steps;

    const validateStep = pipelineSteps.find((s) => /validate data/i.test(s.name));
    const eloStep = pipelineSteps.find((s) => /compute elo/i.test(s.name));
    const generateStep = pipelineSteps.find((s) => /generate json/i.test(s.name));

    expect(validateStep.run).toMatch(/node scripts\/validate\.js/);
    expect(eloStep.run).toMatch(/node scripts\/elo\.js/);
    expect(generateStep.run).toMatch(/node scripts\/generate\.js/);
  });
});

// ─── Fallback mechanism ────────────────────────────────────────────────────

describe('pipeline.yml — fallback scraping mechanism', () => {
  it('LNR scrape step has continue-on-error: true', () => {
    const wf = loadWorkflow();
    const lnrStep = wf.jobs.pipeline.steps.find(
      (s) => /scrape lnr/i.test(s.name),
    );
    expect(lnrStep).toBeDefined();
    expect(lnrStep['continue-on-error']).toBe(true);
  });

  it('fallback step runs only if LNR step fails', () => {
    const wf = loadWorkflow();
    const fallbackStep = wf.jobs.pipeline.steps.find(
      (s) => /fallback/i.test(s.name),
    );
    expect(fallbackStep).toBeDefined();
    expect(fallbackStep.if).toMatch(/failure/);
  });

  it('fallback step uses SCRAPE_SOURCE=api-sports', () => {
    const wf = loadWorkflow();
    const fallbackStep = wf.jobs.pipeline.steps.find(
      (s) => /fallback/i.test(s.name),
    );
    expect(fallbackStep.run).toMatch(/SCRAPE_SOURCE=api-sports/);
    expect(fallbackStep.run).toMatch(/scrape\.js/);
  });

  it('check step fails pipeline if both sources fail', () => {
    const wf = loadWorkflow();
    const checkStep = wf.jobs.pipeline.steps.find(
      (s) => /check scraping/i.test(s.name),
    );
    expect(checkStep).toBeDefined();
    expect(checkStep.if).toMatch(/failure/);
    expect(checkStep.run).toMatch(/exit 1/);
  });
});

// ─── Commit and push ───────────────────────────────────────────────────────

describe('pipeline.yml — commit and push', () => {
  it('has a commit step that configures git user', () => {
    const wf = loadWorkflow();
    const commitStep = wf.jobs.pipeline.steps.find(
      (s) => /commit/i.test(s.name),
    );
    expect(commitStep).toBeDefined();
    expect(commitStep.run).toMatch(/git config user\.name/);
    expect(commitStep.run).toMatch(/github-actions\[bot\]/);
  });

  it('only commits specific data files (not intermediate)', () => {
    const wf = loadWorkflow();
    const commitStep = wf.jobs.pipeline.steps.find(
      (s) => /commit/i.test(s.name),
    );
    expect(commitStep.run).toMatch(/git add data\/2025-2026\.json data\/seasons\.json/);
    // Must NOT use git add data/ (would include intermediate files)
    expect(commitStep.run).not.toMatch(/git add data\/\s/);
  });

  it('skips commit if no changes (idempotence)', () => {
    const wf = loadWorkflow();
    const commitStep = wf.jobs.pipeline.steps.find(
      (s) => /commit/i.test(s.name),
    );
    expect(commitStep.run).toMatch(/git diff --staged --quiet/);
    expect(commitStep.run).toMatch(/No changes to commit/);
  });
});

// ─── Alerting ──────────────────────────────────────────────────────────────

describe('pipeline.yml — alerting on consecutive failures', () => {
  it('has an alerting step that runs on failure', () => {
    const wf = loadWorkflow();
    const alertStep = wf.jobs.pipeline.steps.find(
      (s) => /alert|consecutive/i.test(s.name),
    );
    expect(alertStep).toBeDefined();
    expect(alertStep.if).toBe('failure()');
  });

  it('alerting step uses gh CLI to check run history', () => {
    const wf = loadWorkflow();
    const alertStep = wf.jobs.pipeline.steps.find(
      (s) => /alert|consecutive/i.test(s.name),
    );
    expect(alertStep.run).toMatch(/gh run list/);
  });

  it('alerting step checks for existing open issues to avoid duplicates', () => {
    const wf = loadWorkflow();
    const alertStep = wf.jobs.pipeline.steps.find(
      (s) => /alert|consecutive/i.test(s.name),
    );
    expect(alertStep.run).toMatch(/gh issue list/);
    expect(alertStep.run).toMatch(/pipeline-failure/);
  });

  it('alerting step creates issue with descriptive title', () => {
    const wf = loadWorkflow();
    const alertStep = wf.jobs.pipeline.steps.find(
      (s) => /alert|consecutive/i.test(s.name),
    );
    expect(alertStep.run).toMatch(/gh issue create/);
    expect(alertStep.run).toMatch(/3 echecs consecutifs/);
  });

  it('alerting step has GH_TOKEN env var', () => {
    const wf = loadWorkflow();
    const alertStep = wf.jobs.pipeline.steps.find(
      (s) => /alert|consecutive/i.test(s.name),
    );
    expect(alertStep.env).toBeDefined();
    expect(alertStep.env.GH_TOKEN).toBeDefined();
  });
});

// ─── T6.2 : Referenced scripts exist ───────────────────────────────────────

describe('pipeline — referenced scripts exist', () => {
  const scripts = ['scrape.js', 'validate.js', 'elo.js', 'generate.js'];

  for (const script of scripts) {
    it(`scripts/${script} exists`, () => {
      const scriptPath = resolve(ROOT, 'scripts', script);
      expect(existsSync(scriptPath)).toBe(true);
    });
  }
});

// ─── T6.3 : Scrape source dispatch ────────────────────────────────────────

describe('scrape.js — fallback source support', () => {
  it('exports getScrapeSources listing available sources', async () => {
    const { getScrapeSources } = await import('../scripts/scrape.js');
    const sources = getScrapeSources();
    expect(sources).toContain('lnr');
    expect(sources).toContain('api-sports');
  });
});
