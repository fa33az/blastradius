import * as fs from 'fs';
import * as path from 'path';
import { BlastRadiusConfig } from './types';

export class ConfigLoader {
  public static loadConfig(cwd: string, customConfigPath?: string): BlastRadiusConfig {
    const possiblePaths = customConfigPath
      ? [path.resolve(cwd, customConfigPath)]
      : [
          path.join(cwd, '.blastradiusrc.json'),
          path.join(cwd, 'blastradius.config.json'),
          path.join(cwd, '.blastradiusrc'),
        ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        try {
          const raw = fs.readFileSync(configPath, 'utf-8');
          const parsed = JSON.parse(raw);
          return parsed as BlastRadiusConfig;
        } catch {
          // Fall through to empty config on parse error
        }
      }
    }

    return {};
  }
}
