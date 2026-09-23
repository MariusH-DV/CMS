import { Controller, Get } from '@nestjs/common';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Public } from './common/decorators/public.decorator';

const REPO_ROOT = process.env.REPO_ROOT
  ? path.resolve(process.env.REPO_ROOT)
  : path.resolve(__dirname, '../../');

function readPackageVersion(): string {
  try {
    const raw = fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8');
    return (JSON.parse(raw).version as string) ?? 'unbekannt';
  } catch {
    return 'unbekannt';
  }
}

/**
 * Kurzer Git-Commit-Hash, damit die angezeigte Version sich bei jedem Deploy
 * tatsaechlich aendert (die manuelle Versionsnummer in package.json wird nicht
 * bei jeder Aenderung angehoben). Zwei Quellen, je nach Umgebung:
 * 1. Docker-Image: die Datei "GIT_SHA", die beim Bauen des Images geschrieben
 *    wurde (siehe backend/Dockerfile) - der Container selbst hat kein .git.
 * 2. Lokale Entwicklung: direkt aus dem vorhandenen Git-Checkout gelesen.
 */
function readGitSha(): string | null {
  try {
    const fromFile = fs.readFileSync(path.join(REPO_ROOT, 'GIT_SHA'), 'utf-8').trim();
    if (fromFile) return fromFile;
  } catch {
    // keine gebaute GIT_SHA-Datei vorhanden - weiter mit Fallback unten
  }
  try {
    return execSync('git rev-parse --short HEAD', { cwd: REPO_ROOT, timeout: 2000 })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function readVersion(): string {
  const pkgVersion = readPackageVersion();
  const gitSha = readGitSha();
  return gitSha ? `${pkgVersion}+${gitSha}` : pkgVersion;
}

const VERSION = readVersion();

@Controller()
export class AppController {
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', version: VERSION };
  }
}
