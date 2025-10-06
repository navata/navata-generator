import fs from "fs";
import path from "path";
import { exec } from "child_process";

const cwd = process.cwd();

// Constants
const API_GET_TEMPLATE_PATH = path.join(
  __dirname,
  "./templates/api-get-template.txt"
);
const API_POST_TEMPLATE_PATH = path.join(
  __dirname,
  "./templates/api-post-template.txt"
);
const TYPE_TEMPLATE_PATH = path.join(
  __dirname,
  "./templates/api-type-template.txt"
);
const API_FOLDER = path.join(cwd, "/src/utils/api");
const TYPES_FOLDER = path.join(cwd, "/src/types");
const HOOKS_FOLDER = path.join(cwd, "/src/hooks");
const HOOK_GET_TEMPLATE_PATH = path.join(
  __dirname,
  "./templates/hook-get-template.txt"
);
const HOOK_POST_TEMPLATE_PATH = path.join(
  __dirname,
  "./templates/hook-post-template.txt"
);
const API_PATH = path.join(cwd, "/src/consts/api-paths.ts");

// Method configuration
const methodConfig = {
  get: {
    templatePath: API_GET_TEMPLATE_PATH,
    hookTemplatePath: HOOK_GET_TEMPLATE_PATH,
  },
  post: {
    templatePath: API_POST_TEMPLATE_PATH,
    hookTemplatePath: HOOK_POST_TEMPLATE_PATH,
  },
  put: {
    templatePath: API_POST_TEMPLATE_PATH,
    hookTemplatePath: HOOK_POST_TEMPLATE_PATH,
  },
  patch: {
    templatePath: API_POST_TEMPLATE_PATH,
    hookTemplatePath: HOOK_POST_TEMPLATE_PATH,
  },
  delete: {
    templatePath: API_POST_TEMPLATE_PATH,
    hookTemplatePath: HOOK_POST_TEMPLATE_PATH,
  }
};

// Helper functions
const toCamelCase = (str: string): string =>
  str
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^-/, "");

const capitalizeFirstLetter = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

const replacePlaceholders = (
  template: string,
  replacements: Record<string, string>
): string =>
  Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`\\$${key}`, "g"), value),
    template
  );

const createFolderIfNotExists = (folderPath: string): void => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

const appendOrWriteFile = (filePath: string, content: string): void => {
  if (fs.existsSync(filePath)) {
    console.log(`File exists, appending content: ${filePath}`);
    fs.appendFileSync(filePath, `\n\n${content}`, "utf8");
  } else {
    fs.writeFileSync(filePath, content, "utf8");
  }
};

function ensureAuthApi(moduleNamePrefix: string, apiDomain: string): void {
  const authApiTemplate = `export const ${moduleNamePrefix} = \`\${apiGateway}${apiDomain}\`;\n`;
  try {
    let content = fs.readFileSync(API_PATH, "utf-8");
    if (!content.includes(`export const ${moduleNamePrefix}`)) {
      content += `${authApiTemplate}`;
      fs.writeFileSync(API_PATH, content, "utf-8");
      console.log("✅ authApi added!");
    } else {
      console.log("✅ authApi already exists.");
    }
  } catch (error) {
    console.error("❌ Error reading or writing file:", error);
  }
}

const extractParams = (path: string): string[] => {
  const regex = /:([a-zA-Z0-9_]+)/g;
  const matches = [...path.matchAll(regex)];
  return matches.map((m) => m[1]);
};

const getParamUrl = (endPoint: string): Record<string, string> => {
  const parameters = extractParams(endPoint);
  if (parameters.length > 0) {
    return {
      DESTRUCTURING_PAYLOAD: `\n      const { ${parameters.join(
        ", "
      )}, ...payload } = args?.payload || {};\n      `,
      ARGUMENT: `payload, paramUrl: {${parameters.join(", ")}},`,
    };
  }
  return {
    DESTRUCTURING_PAYLOAD: "",
    ARGUMENT: "payload: args.payload,",
  };
};

const formatCode = (createdFiles: string[]) => {
  exec(
    `pnpm exec prettier --write ${createdFiles.join(" ")}`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Lỗi: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
    }
  );
};

export interface CreateApiFileParams {
  moduleName: string;
  fileName: string;
  endPoint: string;
  method?: string;
  apiDomain?: string;
  typeValue?: string;
  shouldCreateHook?: boolean;
  shouldCreateAPI?: boolean;
}

export const createApiFile = ({
  moduleName,
  fileName,
  endPoint,
  method = "GET",
  shouldCreateHook,
  apiDomain = "",
  typeValue = "",
  shouldCreateAPI,
}: CreateApiFileParams): void => {
  const folderPath = path.join(API_FOLDER, moduleName);
  const filePath = path.join(folderPath, `${fileName}.ts`);
  const typesFolderPath = path.join(TYPES_FOLDER, moduleName);
  const typesFilePath = path.join(typesFolderPath, `${fileName}.ts`);
  const hooksFolderPath = path.join(HOOKS_FOLDER, moduleName);
  const createdFiles: string[] = [];

  createFolderIfNotExists(folderPath);
  createFolderIfNotExists(typesFolderPath);
  if (shouldCreateHook) {
    createFolderIfNotExists(hooksFolderPath);
  }

  const apiTemplate = fs.readFileSync(
    methodConfig[method.toLowerCase() as keyof typeof methodConfig]
      ?.templatePath || API_GET_TEMPLATE_PATH,
    "utf8"
  );
  const typeTemplate = fs.readFileSync(TYPE_TEMPLATE_PATH, "utf8");

  const functionName = toCamelCase(`${moduleName}-${fileName}`);
  const typeFunctionName = capitalizeFirstLetter(functionName);
  const paramType = `${typeFunctionName}Param`;
  const responseType = `${typeFunctionName}ResponseData`;
  const hookName = `use${capitalizeFirstLetter(functionName)}`;
  const hookFilePath = path.join(hooksFolderPath, `${hookName}.ts`);
  const moduleNamePrefix = `${toCamelCase(moduleName)}Api`;

  apiDomain && ensureAuthApi(moduleNamePrefix, apiDomain);

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
    `\nexport type ${paramType} = any;\nexport type ${responseType} = any;\n  `;

  const typeContent = replacePlaceholders(typeTemplate, {
    TYPE_VALUE: typeValueText,
  });

  try {
    if (shouldCreateAPI) {
      appendOrWriteFile(filePath, apiContent);
      appendOrWriteFile(typesFilePath, typeContent);
      createdFiles.push(filePath);
      createdFiles.push(typesFilePath);
      formatCode(createdFiles);
    }

    if (shouldCreateHook) {
      const hookTemplatePath =
        methodConfig[method.toLowerCase() as keyof typeof methodConfig]
          ?.hookTemplatePath;
      if (!hookTemplatePath) {
        console.warn(`No hook template found for method: ${method}`);
        return;
      }

      const hookTemplate = fs.readFileSync(hookTemplatePath, "utf8");
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
      createdFiles.push(hookFilePath);

      formatCode(createdFiles);
    }
    console.log("✅ Result:\n");
    console.log(createdFiles.join("\n"));
  } catch (error: any) {
    console.error(`Error writing files: ${error.message}`);
    process.exit(1);
  }
};

export { toCamelCase, capitalizeFirstLetter };
