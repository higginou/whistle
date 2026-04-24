import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DATABASE_TABLES } from '../src/server/db/schema.js'

const DB_DIR = resolve(import.meta.dirname, '..', 'src', 'server', 'db')
const schemaSql = readFileSync(resolve(DB_DIR, 'migrations', '001_initial_schema.sql'), 'utf-8')
const seedSql = readFileSync(resolve(DB_DIR, 'seeds', '001_current_season.sql'), 'utf-8')
const matchesTableSql = schemaSql.slice(
  schemaSql.indexOf('CREATE TABLE IF NOT EXISTS matches'),
  schemaSql.indexOf('CREATE INDEX IF NOT EXISTS idx_matches_season_matchday'),
)

describe('database schema for Vercel Postgres migration', () => {
  it('defines the minimal relational tables for seasons, matches, snapshots, and audit logs', () => {
    expect(DATABASE_TABLES).toEqual({
      seasons: 'seasons',
      matches: 'matches',
      projectionSnapshots: 'projection_snapshots',
      auditLog: 'audit_log',
    })

    for (const table of Object.values(DATABASE_TABLES)) {
      expect(schemaSql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`)
    }
  })

  it('stores submitted match scores as first-class columns instead of a JSON blob', () => {
    expect(schemaSql).toContain('home_team_id TEXT NOT NULL')
    expect(schemaSql).toContain('away_team_id TEXT NOT NULL')
    expect(schemaSql).toContain('home_score SMALLINT')
    expect(schemaSql).toContain('away_score SMALLINT')
    expect(schemaSql).toContain("status = 'played' AND home_score IS NOT NULL AND away_score IS NOT NULL")
    expect(schemaSql).toContain("status <> 'played' AND home_score IS NULL AND away_score IS NULL")
    expect(schemaSql).toContain('prevent_team_double_booking')
    expect(schemaSql).toContain('UNIQUE (season_id, matchday, home_team_id, away_team_id)')
    expect(matchesTableSql).not.toMatch(/JSONB/i)
  })

  it('keeps generated projections append-only', () => {
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS projection_snapshots')
    expect(schemaSql).toContain('generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()')
    expect(schemaSql).toContain("CHECK (jsonb_typeof(standings) = 'object')")
    expect(schemaSql).toContain('CREATE INDEX IF NOT EXISTS idx_projection_snapshots_season_generated')
    expect(schemaSql).toContain('prevent_projection_snapshot_mutation')
    expect(schemaSql).toContain('BEFORE UPDATE OR DELETE ON projection_snapshots')
    expect(schemaSql).not.toMatch(/ON CONFLICT[\s\S]*projection_snapshots/i)
  })

  it('seeds the current TOP 14 season', () => {
    expect(seedSql).toContain("'2025-2026'")
    expect(seedSql).toContain("'Saison 2025-2026'")
    expect(seedSql).toContain('is_current')
    expect(seedSql).toContain('UPDATE seasons')
    expect(seedSql).toContain("WHERE id <> '2025-2026'")
  })
})
