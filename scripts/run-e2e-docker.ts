import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const composeArgs = ['compose', '-f', 'docker-compose.e2e.yml'];
const e2ePort = process.env.E2E_PORT ?? '3100';
const playwrightCli = createRequire(import.meta.url).resolve(
  '@playwright/test/cli',
);

function runCommand(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): number {
  const result = spawnSync(command, args, {
    env,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`Failed to run ${command}: ${result.error.message}`);
    return 1;
  }

  if (result.signal) {
    console.error(`${command} terminated by signal ${result.signal}`);
    return 1;
  }

  return result.status ?? 1;
}

let exitCode = 1;
let shouldShowReport = false;

try {
  exitCode = runCommand('docker', [...composeArgs, 'down', '--volumes']);

  if (exitCode === 0) {
    exitCode = runCommand('docker', [
      ...composeArgs,
      'up',
      '--build',
      '--wait',
      '--wait-timeout',
      '300',
    ]);
  }

  if (exitCode === 0) {
    exitCode = runCommand(
      process.execPath,
      [playwrightCli, 'test', ...process.argv.slice(2)],
      {
        ...process.env,
        PLAYWRIGHT_BASE_URL: `http://localhost:${e2ePort}`,
        PLAYWRIGHT_EXTERNAL_SERVER: '1',
        PLAYWRIGHT_HTML_OPEN: 'never',
      },
    );
    shouldShowReport = exitCode !== 0 && !process.env.CI;
  }
} finally {
  const teardownExitCode = runCommand('docker', [
    ...composeArgs,
    'down',
    '--volumes',
  ]);

  if (exitCode === 0 && teardownExitCode !== 0) {
    exitCode = teardownExitCode;
  }
}

if (shouldShowReport) {
  runCommand(process.execPath, [playwrightCli, 'show-report']);
}

process.exitCode = exitCode;
