// pre-commit: scan staged changes for secrets. gitleaks is a separate program
// (Windows: `winget install Gitleaks.Gitleaks`); without it the scan is skipped with a notice,
// CI runs it anyway.
import { spawnSync } from 'node:child_process';

const r = spawnSync('gitleaks', ['git', '--pre-commit', '--staged', '--redact', '--no-banner'], {
  stdio: 'inherit',
});
if (r.error?.code === 'ENOENT') {
  console.warn('gitleaks not installed: secret scan skipped (winget install Gitleaks.Gitleaks)');
  process.exit(0);
}
process.exit(r.status ?? 1);
