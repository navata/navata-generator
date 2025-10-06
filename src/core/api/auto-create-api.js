const { createApiFile } = require('./generic-api');

// CLI Input
const [moduleName, fileName, endPoint, method = 'GET', shouldCreateHook = 'false'] =
  process.argv.slice(2);

if (!moduleName || !fileName || !endPoint) {
  console.error('Usage: node create-api-file.js <moduleName> <fileName> <endPoint> <method>');
  process.exit(1);
}

createApiFile({
  moduleName,
  fileName,
  endPoint,
  method,
  shouldCreateHook: shouldCreateHook === 'true',
});
