const fs = require('fs');
const path = require('path');

// Delete non-pnpm lockfiles to avoid confusion
const rootDir = path.resolve(__dirname, '..');
['package-lock.json', 'yarn.lock'].forEach(file => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Removed non-pnpm lockfile: ${file}`);
    } catch (err) {
      console.warn(`Could not remove ${file}: ${err.message}`);
    }
  }
});

// Verify pnpm is being used
const agent = process.env.npm_config_user_agent || '';
if (!agent.startsWith('pnpm/') && !process.env.CI && !process.env.RAILWAY_STATIC_URL) {
  console.error('\x1b[31m%s\x1b[0m', '=========================================================');
  console.error('\x1b[31m%s\x1b[0m', 'ERROR: Use pnpm instead of npm/yarn to install packages.');
  console.error('\x1b[31m%s\x1b[0m', '=========================================================');
  process.exit(1);
}

