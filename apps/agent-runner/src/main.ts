import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { promisify } from 'node:util';

/**
 * Agent runner — plan 01 stub. It completes the monorepo shape and the Docker image; the
 * workspaces, the `claude-code` provider and the job endpoint are plan 03. What exists today:
 * `GET /health` → `{ ok, workspacesDir, claudeVersion }` (the CLI version is read once at boot).
 */

const PORT = Number(process.env.RUNNER_PORT ?? 3102);
const WORKSPACES_DIR = process.env.WORKSPACES_DIR ?? '/workspaces';

const exec = promisify(execFile);

async function claudeVersion(): Promise<string | null> {
  try {
    const { stdout } = await exec('claude', ['--version'], { timeout: 10_000, windowsHide: true });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const version = await claudeVersion();
  const server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, workspacesDir: WORKSPACES_DIR, claudeVersion: version }));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ code: 'NOT_FOUND' }));
  });
  server.listen(PORT, () => {
    console.log(
      `agent-runner listening on http://localhost:${PORT} (claude: ${version ?? 'absent'})`,
    );
  });

  const stop = (): void => {
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

void main();
