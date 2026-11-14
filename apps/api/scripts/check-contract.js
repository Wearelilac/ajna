/**
 * Check that committed OpenAPI contract matches generated one.
 * Fails build if contract is stale (00-stack-and-conventions.md, section 7).
 */
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

try {
  const swaggerJsonPath = path.join(__dirname, '../dist/swagger.json');
  const contractPath = path.join(__dirname, '../../contracts/openapi.v1.yaml');

  if (!fs.existsSync(swaggerJsonPath)) {
    console.error('swagger.json not found. Run "npm run build" first.');
    process.exit(1);
  }

  if (!fs.existsSync(contractPath)) {
    console.error(`Contract not found at ${contractPath}`);
    process.exit(1);
  }

  const swaggerJson = JSON.parse(fs.readFileSync(swaggerJsonPath, 'utf8'));
  const contractYaml = YAML.parse(fs.readFileSync(contractPath, 'utf8'));

  // Compare key sections
  const swaggerPaths = JSON.stringify(swaggerJson.paths || {});
  const contractPaths = JSON.stringify(contractYaml.paths || {});

  if (swaggerPaths !== contractPaths) {
    console.error('❌ OpenAPI contract is stale. Run "npm run contract:generate" to update.');
    process.exit(1);
  }

  console.log('✓ OpenAPI contract is up to date');
  process.exit(0);
} catch (err) {
  console.error(`Error checking contract: ${err.message}`);
  process.exit(1);
}
