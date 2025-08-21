import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setInterval } from 'timers';

// Get __dirname in ES module

const filePath = 'session-keys.json';

function readSessions() {
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, 'utf-8');

  return JSON.parse(data);
}

function writeSessions(sessions) {
  fs.writeFileSync(filePath, JSON.stringify(sessions, null, 2));
}

function cleanExpiredSessions() {
  const sessions = readSessions();
  const now = Math.floor(Date.now() / 1000);
  const valid = sessions.filter(s => s.expiration > now);

  if (valid.length !== sessions.length) {
    console.log(`[Worker] Cleaned ${sessions.length - valid.length} expired sessions at ${new Date().toISOString()}`);
    writeSessions(valid);
  }
}

function start() {
  console.log('[Worker] Session cleaner started');
  setInterval(cleanExpiredSessions, 5000);
}

start();
