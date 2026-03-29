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

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrapeRugbyrama } from './scrape-rugbyrama.js';
import { scrapeLnr } from './scrape-lnr.js';

const OUTPUT_PATH = resolve(import.meta.dirname, '..', 'data', 'scraped.json');

/**
 * Run the scraping pipeline: Rugbyrama first, LNR fallback.
 */
async function main() {
  let output;

  // Primary: Rugbyrama
  try {
    output = await scrapeRugbyrama();
    console.log('Rugbyrama scraping succeeded.');
  } catch (err) {
    console.warn(`Rugbyrama failed: ${err.message}`);
    console.warn('Falling back to LNR...');

    // Fallback: LNR
    try {
      output = await scrapeLnr();
      console.log('LNR fallback scraping succeeded.');
    } catch (lnrErr) {
      console.error(`LNR fallback also failed: ${lnrErr.message}`);
      process.exit(1);
    }
  }

  // Write output
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');

  // Summary
  console.log('Scraping complete:');
  console.log(`  Source: ${output.source}`);
  console.log(`  Matchday: ${output.matchday}`);
  console.log(`  Complete: ${output.complete}`);
  console.log(`  Standings: ${output.standings.length} teams`);
  console.log(`  Results: ${output.results.length} matches`);
  console.log(`  Calendar: ${output.calendar.length} upcoming matches`);
  console.log(`  Output: ${OUTPUT_PATH}`);
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
