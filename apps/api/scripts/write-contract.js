/**
 * Write OpenAPI contract to contracts/openapi.v1.yaml
 * Run after nest swagger generates dist/swagger.json
 */
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

try {
  // Read generated swagger.json from NestJS Swagger
  const swaggerJsonPath = path.join(__dirname, '../dist/swagger.json');
  
  if (!fs.existsSync(swaggerJsonPath)) {
    console.error(`Swagger JSON not found at ${swaggerJsonPath}`);
    console.error('Run "npm run build" first to generate dist/swagger.json');
    process.exit(1);
  }

  const swaggerJson = JSON.parse(fs.readFileSync(swaggerJsonPath, 'utf8'));
  
  // Convert to YAML
  const contractPath = path.join(__dirname, '../../contracts/openapi.v1.yaml');
  fs.writeFileSync(contractPath, YAML.stringify(swaggerJson, { indent: 2 }));

  console.log(`✓ Contract written to ${contractPath}`);
} catch (err) {
  console.error(`Error writing contract: ${err.message}`);
  process.exit(1);
}
