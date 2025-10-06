const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const createdFiles = [];

// Constants
const API_GET_TEMPLATE_PATH = path.join(__dirname, './templates/api-get-template.txt');
const API_POST_TEMPLATE_PATH = path.join(__dirname, './templates/api-post-template.txt');
const TYPE_TEMPLATE_PATH = path.join(__dirname, './templates/api-type-template.txt');
const API_FOLDER = path.join(__dirname, '../src/utils/api');
const TYPES_FOLDER = path.join(__dirname, '../src/types');
const HOOKS_FOLDER = path.join(__dirname, '../src/hooks');
const HOOK_GET_TEMPLATE_PATH = path.join(__dirname, './templates/hook-get-template.txt');
const HOOK_POST_TEMPLATE_PATH = path.join(__dirname, './templates/hook-post-template.txt');
const API_PATH = path.join(__dirname, '../src/consts/api-paths.ts');

// Method configuration
const methodConfig = {
  get: { templatePath: API_GET_TEMPLATE_PATH, hookTemplatePath: HOOK_GET_TEMPLATE_PATH },
  post: { templatePath: API_POST_TEMPLATE_PATH, hookTemplatePath: HOOK_POST_TEMPLATE_PATH },
  put: { templatePath: API_POST_TEMPLATE_PATH, hookTemplatePath: HOOK_POST_TEMPLATE_PATH },
};

// Helper functions
const toCamelCase = (str) =>
  str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^-/, '');

const capitalizeFirstLetter = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const replacePlaceholders = (template, replacements) =>
  Object.entries(replacements).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\$${key}`, 'g'), value),
    template
  );

const createFolderIfNotExists = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

const appendOrWriteFile = (filePath, content) => {
  if (fs.existsSync(filePath)) {
    console.log(`File exists, appending content: ${filePath}`);
    fs.appendFileSync(filePath, `\n\n${content}`, 'utf8');
  } else {
    console.log(`Creating new file: ${filePath}`);
    fs.writeFileSync(filePath, content, 'utf8');
  }
};

function ensureAuthApi(moduleNamePrefix, apiDomain) {
  const authApiTemplate = `export const ${moduleNamePrefix} = \`\${apiGateway}${apiDomain}/api\`;\n`;
  console.log(authApiTemplate);
  try {
    let content = fs.readFileSync(API_PATH, 'utf-8');

    if (!content.includes(`export const ${moduleNamePrefix}`)) {
      content += `${authApiTemplate}`;
      fs.writeFileSync(API_PATH, content, 'utf-8');
      console.log('✅ authApi added!');
    } else {
      console.log('✅ authApi already exists.');
    }
  } catch (error) {
    console.error('❌ Error reading or writing file:', error);
  }
}

const extractParams = (path) => {
  const regex = /:([a-zA-Z0-9_]+)/g;
  const matches = [...path.matchAll(regex)];
  return matches.map((m) => m[1]);
};

const getParamUrl = (endPoint) => {
  const parameters = extractParams(endPoint);
  if (parameters.length > 0) {
    return {
      DESTRUCTURING_PAYLOAD: `
      const { ${parameters.join(', ')}, ...payload } = args?.payload || {};
      `,
      ARGUMENT: `payload, paramUrl: {${parameters.join(', ')}},`,
    };
  }

  return {
    DESTRUCTURING_PAYLOAD: '',
    ARGUMENT: 'payload: args.payload,',
  };
};

// Main function
const createApiFile = ({
  moduleName,
  fileName,
  endPoint,
  method = 'GET',
  shouldCreateHook,
  apiDomain = '',
  typeValue = '',
}) => {
  const folderPath = path.join(API_FOLDER, moduleName);
  const filePath = path.join(folderPath, `${fileName}.ts`);
  const typesFolderPath = path.join(TYPES_FOLDER, moduleName);
  const typesFilePath = path.join(typesFolderPath, `${fileName}.ts`);
  const hooksFolderPath = path.join(HOOKS_FOLDER, moduleName);

  // Create folders if not exist
  createFolderIfNotExists(folderPath);
  createFolderIfNotExists(typesFolderPath);
  if (shouldCreateHook) {
    createFolderIfNotExists(hooksFolderPath);
  }

  // Read templates
  const apiTemplate = fs.readFileSync(
    methodConfig[method.toLowerCase()]?.templatePath || API_GET_TEMPLATE_PATH,
    'utf8'
  );
  const typeTemplate = fs.readFileSync(TYPE_TEMPLATE_PATH, 'utf8');

  // Generate names
  const functionName = toCamelCase(`${moduleName}-${fileName}`);
  const typeFunctionName = capitalizeFirstLetter(functionName);
  const paramType = `${typeFunctionName}Param`;
  const responseType = `${typeFunctionName}ResponseData`;

  // Tên function và hook theo camelCase
  const hookName = `use${capitalizeFirstLetter(functionName)}`;
  const hookFilePath = path.join(hooksFolderPath, `${hookName}.ts`);

  const moduleNamePrefix = `${toCamelCase(moduleName)}Api`;

  // Check exist and create api path
  apiDomain && ensureAuthApi(moduleNamePrefix, apiDomain);

  // Replace placeholders
  const apiContent = replacePlaceholders(apiTemplate, {
    MODULE_NAME: moduleName,
    FILE_NAME: fileName,
    METHOD: method.toUpperCase(),
    FUNCTION_NAME: functionName,
    PARAM_TYPES: paramType,
    RESPONSE_TYPES: responseType,
    API_PATH: moduleNamePrefix,
    END_POINT: endPoint,
    ...getParamUrl(endPoint),
  });

  const typeValueText =
    typeValue ||
    `
    export type ${paramType} = any;
    export type ${responseType} = any;
  `;

  const typeContent = replacePlaceholders(typeTemplate, {
    TYPE_VALUE: typeValueText,
  });

  // Write or append API file
  try {
    appendOrWriteFile(filePath, apiContent);
    appendOrWriteFile(typesFilePath, typeContent);
    console.log(`API file created: ${filePath}`);
    console.log(`Type file created: ${typesFilePath}`);
    createdFiles.push(filePath);
    createdFiles.push(typesFilePath);

    // Nếu có yêu cầu tạo hook
    if (shouldCreateHook) {
      const hookTemplatePath = methodConfig[method.toLowerCase()]?.hookTemplatePath;
      if (!hookTemplatePath) {
        console.warn(`No hook template found for method: ${method}`);
        return;
      }

      const hookTemplate = fs.readFileSync(hookTemplatePath, 'utf8');
      const hookContent = replacePlaceholders(hookTemplate, {
        MODULE_NAME: moduleName,
        FILE_NAME: fileName,
        HOOK_NAME: hookName,
        FUNCTION_NAME: functionName,
        PARAM_TYPES: paramType,
        RESPONSE_TYPES: responseType,
        API_IMPORT: `import { ${functionName} } from '@/utils/api/${moduleName}/${fileName}';`,
      });

      appendOrWriteFile(hookFilePath, hookContent);
      console.log(`Hook file created: ${hookFilePath}`);
      createdFiles.push(hookFilePath);

      exec(`pnpm exec prettier --write ${createdFiles.join(' ')}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Lỗi: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }
        console.log(`Kết quả:\n${stdout}`);
      });
    }
  } catch (error) {
    console.error(`Error writing files: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { createApiFile, toCamelCase, capitalizeFirstLetter };
