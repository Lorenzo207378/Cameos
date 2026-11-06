import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const projectPath = fileURLToPath(new URL('../', import.meta.url));
const integrationSuites = [
  'test-api.mjs',
  'test-repository.mjs',
  'test-viewmodel.mjs',
  'test-edge-cases-and-contracts.mjs',
  'test-carousel-loading.mjs'
];
const files = readdirSync(new URL('./', import.meta.url))
  .filter(file => /^test-.*\.mjs$/.test(file)).sort();
const unitSuites = files.filter(file => !integrationSuites.includes(file));
const failures = [];

function runSuite(label, args) {
  console.log(`\n[TEST] ${label}`);
  const result = spawnSync(process.execPath, args, {
    cwd: projectPath,
    stdio: 'inherit',
    windowsHide: true
  });
  if (result.status !== 0) {
    failures.push(label);
    if (result.error) console.error(result.error.message);
  }
}

runSuite('Unit and contract tests', ['--test', ...unitSuites.map(file => `scripts/${file}`)]);
for (const file of integrationSuites) runSuite(file, [`scripts/${file}`]);

console.log(`\n${files.length} test files executed; ${failures.length} failed suites.`);
if (failures.length) console.error(`Failed suites: ${failures.join(', ')}`);
process.exitCode = failures.length ? 1 : 0;
