import { Controller, Get } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Public } from './common/decorators/public.decorator';

const REPO_ROOT = process.env.REPO_ROOT
  ? path.resolve(process.env.REPO_ROOT)
  : path.resolve(__dirname, '../../');

function readVersion(): string {
  try {
    const raw = fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8');
    return (JSON.parse(raw).version as string) ?? 'unbekannt';
  } catch {
    return 'unbekannt';
  }
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
