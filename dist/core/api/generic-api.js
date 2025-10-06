"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.capitalizeFirstLetter = exports.toCamelCase = exports.createApiFile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const cwd = process.cwd();
// Constants
const API_GET_TEMPLATE_PATH = path_1.default.join(__dirname, "./templates/api-get-template.txt");
const API_POST_TEMPLATE_PATH = path_1.default.join(__dirname, "./templates/api-post-template.txt");
const TYPE_TEMPLATE_PATH = path_1.default.join(__dirname, "./templates/api-type-template.txt");
const API_FOLDER = path_1.default.join(cwd, "/src/utils/api");
const TYPES_FOLDER = path_1.default.join(cwd, "/src/types");
const HOOKS_FOLDER = path_1.default.join(cwd, "/src/hooks");
const HOOK_GET_TEMPLATE_PATH = path_1.default.join(__dirname, "./templates/hook-get-template.txt");
const HOOK_POST_TEMPLATE_PATH = path_1.default.join(__dirname, "./templates/hook-post-template.txt");
const API_PATH = path_1.default.join(cwd, "/src/consts/api-paths.ts");
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
const toCamelCase = (str) => str
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^-/, "");
exports.toCamelCase = toCamelCase;
const capitalizeFirstLetter = (str) => str.charAt(0).toUpperCase() + str.slice(1);
exports.capitalizeFirstLetter = capitalizeFirstLetter;
const replacePlaceholders = (template, replacements) => Object.entries(replacements).reduce((result, [key, value]) => result.replace(new RegExp(`\\$${key}`, "g"), value), template);
const createFolderIfNotExists = (folderPath) => {
    if (!fs_1.default.existsSync(folderPath)) {
        fs_1.default.mkdirSync(folderPath, { recursive: true });
    }
};
const appendOrWriteFile = (filePath, content) => {
    if (fs_1.default.existsSync(filePath)) {
        console.log(`File exists, appending content: ${filePath}`);
        fs_1.default.appendFileSync(filePath, `\n\n${content}`, "utf8");
    }
    else {
        fs_1.default.writeFileSync(filePath, content, "utf8");
    }
};
function ensureAuthApi(moduleNamePrefix, apiDomain) {
    const authApiTemplate = `export const ${moduleNamePrefix} = \`\${apiGateway}${apiDomain}\`;\n`;
    try {
        let content = fs_1.default.readFileSync(API_PATH, "utf-8");
        if (!content.includes(`export const ${moduleNamePrefix}`)) {
            content += `${authApiTemplate}`;
            fs_1.default.writeFileSync(API_PATH, content, "utf-8");
            console.log("✅ authApi added!");
        }
        else {
            console.log("✅ authApi already exists.");
        }
    }
    catch (error) {
        console.error("❌ Error reading or writing file:", error);
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
            DESTRUCTURING_PAYLOAD: `\n      const { ${parameters.join(", ")}, ...payload } = args?.payload || {};\n      `,
            ARGUMENT: `payload, paramUrl: {${parameters.join(", ")}},`,
        };
    }
    return {
        DESTRUCTURING_PAYLOAD: "",
        ARGUMENT: "payload: args.payload,",
    };
};
const formatCode = (createdFiles) => {
    (0, child_process_1.exec)(`pnpm exec prettier --write ${createdFiles.join(" ")}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Lỗi: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
    });
};
const createApiFile = ({ moduleName, fileName, endPoint, method = "GET", shouldCreateHook, apiDomain = "", typeValue = "", shouldCreateAPI, }) => {
    const folderPath = path_1.default.join(API_FOLDER, moduleName);
    const filePath = path_1.default.join(folderPath, `${fileName}.ts`);
    const typesFolderPath = path_1.default.join(TYPES_FOLDER, moduleName);
    const typesFilePath = path_1.default.join(typesFolderPath, `${fileName}.ts`);
    const hooksFolderPath = path_1.default.join(HOOKS_FOLDER, moduleName);
    const createdFiles = [];
    createFolderIfNotExists(folderPath);
    createFolderIfNotExists(typesFolderPath);
    if (shouldCreateHook) {
        createFolderIfNotExists(hooksFolderPath);
    }
    const apiTemplate = fs_1.default.readFileSync(methodConfig[method.toLowerCase()]
        ?.templatePath || API_GET_TEMPLATE_PATH, "utf8");
    const typeTemplate = fs_1.default.readFileSync(TYPE_TEMPLATE_PATH, "utf8");
    const functionName = toCamelCase(`${moduleName}-${fileName}`);
    const typeFunctionName = capitalizeFirstLetter(functionName);
    const paramType = `${typeFunctionName}Param`;
    const responseType = `${typeFunctionName}ResponseData`;
    const hookName = `use${capitalizeFirstLetter(functionName)}`;
    const hookFilePath = path_1.default.join(hooksFolderPath, `${hookName}.ts`);
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
    const typeValueText = typeValue ||
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
            const hookTemplatePath = methodConfig[method.toLowerCase()]
                ?.hookTemplatePath;
            if (!hookTemplatePath) {
                console.warn(`No hook template found for method: ${method}`);
                return;
            }
            const hookTemplate = fs_1.default.readFileSync(hookTemplatePath, "utf8");
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
    }
    catch (error) {
        console.error(`Error writing files: ${error.message}`);
        process.exit(1);
    }
};
exports.createApiFile = createApiFile;
