#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Resolve a path relative to the repository root.
 */
const resolvePath = (relativePath) => path.resolve(__dirname, '..', relativePath);

const toRepoRelative = (absolutePath) => {
  const repoRoot = path.resolve(__dirname, '..');
  return path.relative(repoRoot, absolutePath);
};

console.log('🔍 DA Submission Manager - Development Troubleshooter\n');

const checks = [
  {
    name: 'Vite Cache Directories',
    check: () => {
      const cacheDirectories = [
        'apps/admin/node_modules/.vite',
        'apps/web/node_modules/.vite',
        'apps/api/node_modules/.vite'
      ];
      return cacheDirectories
        .map(resolvePath)
        .filter(fs.existsSync)
        .map(toRepoRelative);
    },
    fix: 'Run: pnpm clean:cache'
  },
  {
    name: 'Direct Heroicon Imports',
    check: () => {
      try {
        const command = 'grep -r "@heroicons/react" apps/*/src --include="*.tsx" --include="*.ts"';
        const result = execSync(command, {
          cwd: path.resolve(__dirname, '..'),
          encoding: 'utf8'
        });
        return result
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
          .slice(0, 5);
      } catch {
        return [];
      }
    },
    fix: 'Use shared icon library or correct Heroicons v2 names'
  },
  {
    name: 'Port Conflicts',
    check: () => {
      const ports = [3001, 5173, 5174];
      const conflicts = [];
      ports.forEach((port) => {
        try {
          execSync(`lsof -ti:${port}`, { stdio: 'ignore' });
          conflicts.push(`Port ${port} in use`);
        } catch {
          // Port is free
        }
      });
      return conflicts;
    },
    fix: 'Kill processes or change ports in vite.config.ts'
  }
];

checks.forEach(({ name, check, fix }) => {
  console.log(`\n📋 Checking: ${name}`);
  const issues = check();
  if (issues.length === 0) {
    console.log('   ✅ No issues found');
  } else {
    console.log('   ⚠️  Issues found:');
    issues.forEach((issue) => console.log(`      - ${issue}`));
    console.log(`   💡 Fix: ${fix}`);
  }
});

console.log('\n🚀 Run "pnpm fix:deps" for complete environment reset\n');


