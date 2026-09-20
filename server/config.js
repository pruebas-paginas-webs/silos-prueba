import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
export const ROOT = path.resolve(import.meta.dirname, '..');
export function config(overrides = {}) {
  const production = process.env.NODE_ENV === 'production';
  const dataDir = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'storage'));
  if (dataDir === path.join(ROOT, 'public') || dataDir.startsWith(path.join(ROOT, 'public') + path.sep)) throw new Error('DATA_DIR debe ser privado.');
  fs.mkdirSync(dataDir, { recursive: true });
  let secret = process.env.SESSION_SECRET;
  if (!secret && !production) {
    const file = path.join(dataDir, '.session-secret');
    if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(48).toString('hex'), {mode: 0o600});
    secret = fs.readFileSync(file, 'utf8');
  }
  if (!secret || secret.length < 32) throw new Error('Configurá SESSION_SECRET (32 caracteres o más).');
  return {root: ROOT, publicDir: path.join(ROOT, 'public'), dataDir, production, secret,
    host: process.env.HOST || '127.0.0.1', port: Number(process.env.PORT || 5174),
    origin: process.env.APP_ORIGIN || 'http://127.0.0.1:5174', quota: Number(process.env.STORAGE_QUOTA_MB || 2048) * 1024 ** 2,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, ...overrides};
}
