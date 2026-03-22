/* eslint-disable no-console */
const chokidar = require('chokidar');
const { execSync } = require('child_process');

const IGNORE = ['.git', 'node_modules', '.next', 'dist', 'build'];
const DEBOUNCE_MS = 1200;

const prefix = process.env.AUTO_COMMIT_MESSAGE_PREFIX || 'chore: auto';

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatTimestamp(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function run(cmd) {
  return execSync(cmd, { stdio: 'pipe' }).toString().trim();
}

function hasChanges() {
  const status = run('git status --porcelain');
  return status.length > 0;
}

let timer = null;

function scheduleCommit() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    try {
      if (!hasChanges()) return;
      run('git add -A');
      const message = `${prefix} ${formatTimestamp(new Date())}`;
      run(`git commit -m "${message}"`);
      run('git push');
      console.log(`[auto-push] committed and pushed: ${message}`);
    } catch (err) {
      console.error('[auto-push] failed:', err.message || err);
    }
  }, DEBOUNCE_MS);
}

console.log('[auto-push] watching for changes...');

const watcher = chokidar.watch('.', {
  ignored: (path) => IGNORE.some((p) => path.includes(p)),
  ignoreInitial: true,
});

watcher
  .on('add', scheduleCommit)
  .on('change', scheduleCommit)
  .on('unlink', scheduleCommit)
  .on('addDir', scheduleCommit)
  .on('unlinkDir', scheduleCommit);

process.on('SIGINT', () => {
  console.log('\n[auto-push] stopped');
  process.exit(0);
});
