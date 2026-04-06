#!/usr/bin/env node

/**
 * scripts/scrape.js
 *
 * Orchestrator — scrapes TOP 14 data using Rugbyrama (primary)
 * with LNR fallback. Writes data/scraped.json for the pipeline.
 *
 * Pipeline position: **scrape.js** -> validate.js -> elo.js -> generate.js
 *
 * Usage: node scripts/scrape.js
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrapeRugbyrama, enrichMatchBonuses } from './scrape-rugbyrama.js';
import { scrapeLnr } from './scrape-lnr.js';

const OUTPUT_PATH = resolve(import.meta.dirname, '..', 'data', 'scraped.json');

/**
 * Load previously enriched results from scraped.json, indexed by matchUrl.
 * Returns empty map if file doesn't exist or has no rugbyrama results.
 */
function loadPreviouslyEnrichedResults() {
  if (!existsSync(OUTPUT_PATH)) return new Map();

  let previous;
  try {
    previous = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8'));
  } catch {
    return new Map();
  }

  if (previous.source !== 'rugbyrama') return new Map();

  const enriched = new Map();
  for (const r of previous.results ?? []) {
    if (r.matchUrl && r.homeBonus !== null) {
      enriched.set(r.matchUrl, {
        homeBonus: r.homeBonus,
        awayBonus: r.awayBonus,
        homeTries: r.homeTries,
        awayTries: r.awayTries,
      });
    }
  }
  return enriched;
}

/**
 * Apply previously enriched bonus data to freshly scraped results.
 * Avoids re-fetching match pages for already-processed matches.
 */
function applyPreviousEnrichment(results, enriched) {
  for (const r of results) {
    if (r.matchUrl && enriched.has(r.matchUrl)) {
      const prev = enriched.get(r.matchUrl);
      r.homeBonus = prev.homeBonus;
      r.awayBonus = prev.awayBonus;
      r.homeTries = prev.homeTries;
      r.awayTries = prev.awayTries;
    }
  }
}

async function main() {
  let output;

  // Primary: Rugbyrama
  try {
    output = await scrapeRugbyrama();
    console.log('Rugbyrama scraping succeeded.');
  } catch (err) {
    console.warn(`Rugbyrama failed: ${err.message}`);
    console.warn('Falling back to LNR...');

    try {
      output = await scrapeLnr();
      console.log('LNR fallback scraping succeeded.');
    } catch (lnrErr) {
      console.error(`LNR fallback also failed: ${lnrErr.message}`);
      process.exit(1);
    }
  }

  // Incremental bonus enrichment (Rugbyrama only — LNR has no match URLs)
  if (output.source === 'rugbyrama') {
    const previouslyEnriched = loadPreviouslyEnrichedResults();
    applyPreviousEnrichment(output.results, previouslyEnriched);
    await enrichMatchBonuses(output.results);
  }

  // Write output
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');

  // Summary
  const enrichedCount = output.results.filter((r) => r.homeBonus !== null).length;
  console.log('Scraping complete:');
  console.log(`  Source: ${output.source}`);
  console.log(`  Matchday: ${output.matchday}`);
  console.log(`  Complete: ${output.complete}`);
  console.log(`  Standings: ${output.standings.length} teams`);
  console.log(`  Results: ${output.results.length} matches (${enrichedCount} with bonus data)`);
  console.log(`  Calendar: ${output.calendar.length} upcoming matches`);
  console.log(`  Output: ${OUTPUT_PATH}`);
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
