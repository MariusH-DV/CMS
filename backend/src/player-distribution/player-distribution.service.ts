import { Injectable, NotFoundException } from '@nestjs/common';
import archiver from 'archiver';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = process.env.REPO_ROOT
  ? path.resolve(process.env.REPO_ROOT)
  : path.resolve(__dirname, '../../../');
const PLAYER_DIR = path.join(REPO_ROOT, 'player');

// "data" (Geraete-Token etc.) und "config" (pro Geraet generierte
// player-config.json) sind Laufzeitzustand des jeweiligen Pi, nicht
// Quellcode - werden beim Update-Skript auf dem Pi bewusst nicht angefasst
// und duerfen daher auch hier nie mitgepackt werden (koennten sonst z.B.
// lokale Test-Geraete-Tokens aus dem Entwicklungs-Checkout enthalten).
const EXCLUDED_TOP_LEVEL = new Set(['node_modules', 'dist', 'data', 'config']);

function listPlayerFiles(baseDir: string, relDir = ''): string[] {
  const entries = fs.readdirSync(path.join(baseDir, relDir), { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    if (!relDir && EXCLUDED_TOP_LEVEL.has(entry.name)) {
      continue;
    }
    const rel = path.join(relDir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(listPlayerFiles(baseDir, rel));
    } else {
      files.push(rel);
    }
  }
  return files;
}

/**
 * Stellt den Player-Quellcode oeffentlich bereit, damit bereits bereitgestellte
 * Raspberry Pis sich selbststaendig aktualisieren koennen (siehe
 * player-update-check.sh.tpl / cms-player-updater.timer).
 */
@Injectable()
export class PlayerDistributionService {
  private assertPlayerDirExists() {
    if (!fs.existsSync(PLAYER_DIR)) {
      throw new NotFoundException(`Player-Quellcode wurde nicht gefunden (${PLAYER_DIR}). REPO_ROOT pruefen.`);
    }
  }

  /** Kurzer Hash ueber alle Player-Quelldateien - aendert sich nur, wenn sich der Code tatsaechlich aendert. */
  getVersion(): string {
    this.assertPlayerDirExists();
    const files = listPlayerFiles(PLAYER_DIR).sort();
    const hash = crypto.createHash('sha256');
    for (const rel of files) {
      hash.update(rel);
      hash.update(fs.readFileSync(path.join(PLAYER_DIR, rel)));
    }
    return hash.digest('hex').slice(0, 16);
  }

  buildPackage(): archiver.Archiver {
    this.assertPlayerDirExists();
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.directory(PLAYER_DIR, false, (entry) => {
      const topLevel = entry.name.split('/')[0];
      if (EXCLUDED_TOP_LEVEL.has(topLevel)) {
        return false;
      }
      return entry;
    });
    archive.finalize();
    return archive;
  }
}
