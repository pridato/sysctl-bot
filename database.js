import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'sysctl.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.prepare(`
  CREATE TABLE IF NOT EXISTS metrics_oura (
    date TEXT PRIMARY KEY,
    readiness_score INTEGER NOT NULL,
    hrv_rmssd INTEGER NOT NULL,
    sleep_efficiency INTEGER NOT NULL,
    rest_heart_rate INTEGER NOT NULL,
    sleep_score INTEGER NOT NULL,
    temperature_deviation REAL NOT NULL,
    activity_score INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

export function saveOuraMetrics({ date, readiness, hrv, efficiency, rhr, sleepScore, tempDev, activityScore }) {
  const stmt = db.prepare(`
    INSERT INTO metrics_oura (date, readiness_score, hrv_rmssd, sleep_efficiency, rest_heart_rate, sleep_score, temperature_deviation, activity_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      readiness_score = excluded.readiness_score,
      hrv_rmssd = excluded.hrv_rmssd,
      sleep_efficiency = excluded.sleep_efficiency,
      rest_heart_rate = excluded.rest_heart_rate,
      sleep_score = excluded.sleep_score,
      temperature_deviation = excluded.temperature_deviation,
      activity_score = excluded.activity_score
  `);
  return stmt.run(date, readiness, hrv, efficiency, rhr, sleepScore, tempDev, activityScore);
}

export function getHistoricalMetrics(limit = 7) {
  return db.prepare(`
    SELECT 
      date, 
      readiness_score, 
      hrv_rmssd, 
      sleep_efficiency,
      rest_heart_rate,
      sleep_score,
      temperature_deviation,
      activity_score
    FROM metrics_oura 
    ORDER BY date DESC 
    LIMIT ?
  `).all(limit);
}
