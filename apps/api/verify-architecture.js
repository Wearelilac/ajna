#!/usr/bin/env node
/**
 * B1.1 Architecture Verification
 * Validates TypeScript structure without requiring npm install.
 * Used for quick feedback during development.
 */

const fs = require('fs');
const path = require('path');

const checks = [];
const errors = [];

function check(name, fn) {
  try {
    fn();
    checks.push({ name, pass: true });
    console.log(`✓ ${name}`);
  } catch (err) {
    checks.push({ name, pass: false, error: err.message });
    errors.push(`✗ ${name}: ${err.message}`);
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
  }
}

// 1. File structure
check('config.ts exists', () => {
  if (!fs.existsSync(path.join(__dirname, 'src/common/config.ts'))) {
    throw new Error('config.ts not found');
  }
});

check('errors.ts exists', () => {
  if (!fs.existsSync(path.join(__dirname, 'src/common/errors.ts'))) {
    throw new Error('errors.ts not found');
  }
});

check('exception-filter.ts exists', () => {
  if (!fs.existsSync(path.join(__dirname, 'src/common/exception-filter.ts'))) {
    throw new Error('exception-filter.ts not found');
  }
});

check('request-id.middleware.ts exists', () => {
  if (!fs.existsSync(path.join(__dirname, 'src/common/request-id.middleware.ts'))) {
    throw new Error('request-id.middleware.ts not found');
  }
});

check('logger.ts exists', () => {
  if (!fs.existsSync(path.join(__dirname, 'src/common/logger.ts'))) {
    throw new Error('logger.ts not found');
  }
});

check('limits.ts exists', () => {
  if (!fs.existsSync(path.join(__dirname, 'src/common/limits.ts'))) {
    throw new Error('limits.ts not found');
  }
});

check('health.controller.ts exists', () => {
  if (!fs.existsSync(path.join(__dirname, 'src/modules/health/health.controller.ts'))) {
    throw new Error('health.controller.ts not found');
  }
});

// 2. Content checks
check('config.ts validates with zod', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/common/config.ts'), 'utf8');
  if (!content.includes('z.object') || !content.includes('envSchema')) {
    throw new Error('Missing zod validation schema');
  }
});

check('errors.ts has ERROR_CODES registry', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/common/errors.ts'), 'utf8');
  if (!content.includes('ERROR_CODES') || !content.includes('INTERNAL_SERVER_ERROR')) {
    throw new Error('Missing error codes registry');
  }
});

check('exception-filter.ts returns standard error shape', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/common/exception-filter.ts'),
    'utf8'
  );
  if (
    !content.includes('statusCode') ||
    !content.includes('error') ||
    !content.includes('code') ||
    !content.includes('message') ||
    !content.includes('requestId')
  ) {
    throw new Error('Missing standard error shape fields');
  }
});

check('request-id.middleware.ts generates UUID', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/common/request-id.middleware.ts'),
    'utf8'
  );
  if (!content.includes('uuid()') || !content.includes('isValidUuid')) {
    throw new Error('Missing UUID generation or validation');
  }
});

check('logger.ts redacts PHI patterns', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/common/logger.ts'), 'utf8');
  if (
    !content.includes('redact') ||
    !content.includes('*.email') ||
    !content.includes('*.audio')
  ) {
    throw new Error('Missing PHI redaction rules');
  }
});

check('limits.ts populated from P0 findings', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/common/limits.ts'), 'utf8');
  if (
    !content.includes('MIN_VALID_DAYS') ||
    !content.includes('Z_THRESHOLD') ||
    !content.includes('RING_BUFFER_DURATION_SEC')
  ) {
    throw new Error('Missing P0 limits');
  }
});

check('health.controller.ts has /v1/health endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/modules/health/health.controller.ts'),
    'utf8'
  );
  if (!content.includes("'health'") || !content.includes('getHealth')) {
    throw new Error('Missing /v1/health endpoint');
  }
});

check('health.controller.ts has /v1/ready endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/modules/health/health.controller.ts'),
    'utf8'
  );
  if (!content.includes("'ready'") || !content.includes('getReady')) {
    throw new Error('Missing /v1/ready endpoint');
  }
});

// 3. Test files
check('health.controller.spec.ts exists', () => {
  if (!fs.existsSync(path.join(__dirname, 'src/modules/health/health.controller.spec.ts'))) {
    throw new Error('Test file not found');
  }
});

check('exception-filter.spec.ts exists', () => {
  if (!fs.existsSync(path.join(__dirname, 'src/common/exception-filter.spec.ts'))) {
    throw new Error('Test file not found');
  }
});

check('logger.spec.ts exists', () => {
  if (!fs.existsSync(path.join(__dirname, 'src/common/logger.spec.ts'))) {
    throw new Error('Test file not found');
  }
});

check('config.spec.ts exists', () => {
  if (!fs.existsSync(path.join(__dirname, 'src/common/config.spec.ts'))) {
    throw new Error('Test file not found');
  }
});

// 4. Configuration files
check('.env.example is committed', () => {
  if (!fs.existsSync(path.join(__dirname, '.env.example'))) {
    throw new Error('.env.example not found');
  }
});

check('tsconfig.json configured with strict mode', () => {
  const content = fs.readFileSync(path.join(__dirname, 'tsconfig.json'), 'utf8');
  if (!content.includes('"strict": true')) {
    throw new Error('Strict mode not enabled');
  }
});

check('jest.config.js configured', () => {
  if (!fs.existsSync(path.join(__dirname, 'jest.config.js'))) {
    throw new Error('jest.config.js not found');
  }
});

// 5. CI/Deployment
check('.github/workflows/api.yml configured', () => {
  const workflowPath = path.join(__dirname, '../../.github/workflows/api.yml');
  if (!fs.existsSync(workflowPath)) {
    throw new Error('CI workflow not found');
  }
  const content = fs.readFileSync(workflowPath, 'utf8');
  if (
    !content.includes('npm run type-check') ||
    !content.includes('npm run lint') ||
    !content.includes('npm run build') ||
    !content.includes('npm test')
  ) {
    throw new Error('CI workflow incomplete');
  }
});

check('render.yaml configured', () => {
  const renderPath = path.join(__dirname, '../../render.yaml');
  if (!fs.existsSync(renderPath)) {
    throw new Error('render.yaml not found');
  }
  const content = fs.readFileSync(renderPath, 'utf8');
  if (
    !content.includes('ajna-api') ||
    !content.includes('DATABASE_URL') ||
    !content.includes('REDIS_URL')
  ) {
    throw new Error('render.yaml incomplete');
  }
});

check('contracts/openapi.v1.yaml exists', () => {
  const contractPath = path.join(__dirname, '../../contracts/openapi.v1.yaml');
  if (!fs.existsSync(contractPath)) {
    throw new Error('Contract not found');
  }
  const content = fs.readFileSync(contractPath, 'utf8');
  if (!content.includes('/v1/health') || !content.includes('/v1/ready')) {
    throw new Error('Contract missing endpoints');
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('B1.1 ARCHITECTURE VERIFICATION');
console.log('='.repeat(60));

const passed = checks.filter((c) => c.pass).length;
const total = checks.length;

console.log(`\n✓ Passed: ${passed}/${total}\n`);

if (errors.length > 0) {
  console.log('Errors:\n');
  errors.forEach((e) => console.log('  ' + e));
  process.exit(1);
}

console.log('All architecture checks passed!');
console.log('\nTo build and test:');
console.log('  npm install');
console.log('  npm run type-check');
console.log('  npm run lint');
console.log('  npm run build');
console.log('  npm test');
console.log('  npm run contract:generate');
