#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = generateAPIAndHook;
const prompts_1 = require("@inquirer/prompts");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const generic_api_1 = require("./generic-api");
const auto_generic_swagger_1 = require("./auto-generic-swagger");
// base URLs cần so sánh
const baseUrls = {
    apiGateway: "https://api-gateway.example.com/",
    vietmapUrl: "https://maps.vietmap.vn/",
};
const cwd = process.cwd();
function convertApiUrl(url) {
    return url.replace(/^\/api\//, "").replace(/{(.*?)}/g, ":$1");
}
function getModuleNameFromUrl(url) {
    const cleanUrl = url
        .replace(/^pmc-ecm-/, "") // bỏ tiền tố pmc-ecm-
        .replace(/\/?api(-golang)?/g, "") // bỏ api hoặc api-golang
        .replace(/\/?service/g, "") // bỏ service
        .replace(/\/api-auth.*$/, "") // bỏ phần api-auth/... phía sau
        .replace(/\/$/, ""); // bỏ dấu slash cuối cùng
    const segments = cleanUrl.split("/");
    return segments[0] || "";
}
function getEndpointName(endpoint) {
    const segments = endpoint
        .split("/")
        .filter((seg) => seg && !seg.startsWith("{") && !seg.endsWith("}"));
    return segments[segments.length - 1] || "";
}
function convertName(name) {
    const nameWithoutApi = name.replace(/Api$/, "");
    return nameWithoutApi.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
const getModuleData = () => {
    try {
        // File cần đọc
        const filePath = path_1.default.join(cwd, "/src/consts/api-paths.ts");
        console.log(filePath);
        // const filePath =
        //   "/Users/thai.nv/Desktop/Project/pmc-ecm-store-new/src/consts/api-paths.ts";
        // Đọc nội dung file
        const content = fs_1.default.readFileSync(filePath, "utf8");
        // Regex tìm các dòng export const
        const regex = /export const (\w+) = `\$\{(\w+)\}([^`]+)`;/g;
        const result = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            const [, name, baseVar, subPath] = match;
            // const baseUrl = baseUrls[baseVar] || "(unknown)";
            result.push({
                name: convertName(name),
                path: subPath,
            });
        }
        return result;
    }
    catch (error) {
        console.log(error);
        return [];
    }
};
const getSubfolders = (dir) => {
    // Đọc tất cả các mục trong thư mục
    const files = fs_1.default.readdirSync(dir);
    // Lọc chỉ các thư mục con
    const subfolders = files.filter((file) => fs_1.default.statSync(path_1.default.join(dir, file)).isDirectory());
    return subfolders;
};
const getModules = () => {
    try {
        // const dirPath = path.join(cwd, "/src/utils/api");
        const dirPath = "/Users/thai.nv/Desktop/Project/pmc-ecm-store-new/src/utils/api";
        return getSubfolders(dirPath);
    }
    catch (error) {
        return [];
    }
};
async function generateAPIAndHook() {
    try {
        const option = await (0, prompts_1.select)({
            message: "Select the option?",
            choices: [
                {
                    name: "Create API",
                    value: "api",
                },
                {
                    name: "Create Hook",
                    value: "hook",
                },
                {
                    name: "Create API & Hook",
                    value: "both",
                },
            ],
        });
        const moduleDataList = getModuleData();
        const apiDomain = await (0, prompts_1.search)({
            message: "What's your domain?",
            pageSize: 20,
            source: async (input, { signal }) => {
                if (!input) {
                    return moduleDataList.map((item) => ({
                        name: item.path,
                        value: item.path,
                        description: `Module name: ${item.name}`,
                    }));
                }
                const data = moduleDataList
                    .filter((item) => item?.path?.includes(input || ""))
                    .map((item) => ({
                    name: item.path,
                    value: item.path,
                    description: `Module name: ${item.name}`,
                }));
                if (data.length > 0) {
                    return data;
                }
                return [
                    {
                        name: input,
                        value: input,
                    },
                ];
            },
        });
        let moduleName = moduleDataList.find((item) => item.path === apiDomain)?.name;
        const swaggerUrl = await (0, prompts_1.input)({ message: "What's your swaggerUrl?" });
        let endPoint = "";
        if (swaggerUrl) {
            const data = await (0, auto_generic_swagger_1.fetchSwagger)(swaggerUrl);
            const pathList = Object.keys(data?.paths) || [];
            endPoint = await (0, prompts_1.search)({
                message: "What's your file the endpoint?",
                pageSize: 20,
                source: async (input, { signal }) => {
                    if (!input) {
                        return pathList.map((item) => ({
                            name: item,
                            value: item,
                        }));
                    }
                    const data = pathList.map((item) => ({
                        name: item,
                        value: item,
                    }));
                    if (data.length > 0) {
                        return data;
                    }
                    return [
                        {
                            name: input,
                            value: input,
                        },
                    ];
                },
            });
        }
        else {
            endPoint = await (0, prompts_1.input)({ message: "What's your file the endpoint?" });
        }
        const method = await (0, prompts_1.select)({
            message: "Select a method",
            choices: [
                {
                    name: "GET",
                    value: "get",
                },
                {
                    name: "POST",
                    value: "post",
                },
                {
                    name: "PUT",
                    value: "put",
                },
                {
                    name: "PATCH",
                    value: "patch",
                },
                {
                    name: "DELETE",
                    value: "delete",
                },
            ],
        });
        if (!moduleName) {
            const moduleRecommended = getModuleNameFromUrl(apiDomain);
            moduleName = await (0, prompts_1.search)({
                message: "What's your module?",
                pageSize: 20,
                source: async (input, { signal }) => {
                    if (!input) {
                        return [
                            {
                                name: moduleRecommended,
                                value: moduleRecommended,
                            },
                        ];
                    }
                    const data = moduleDataList
                        .filter((item) => item?.name?.includes(input || ""))
                        .map((item, index) => ({
                        name: item.name,
                        value: item.name,
                    }));
                    if (data.length > 0) {
                        return data;
                    }
                    return [
                        {
                            name: input,
                            value: input,
                        },
                    ];
                },
            });
        }
        const fileName = await (0, prompts_1.input)({
            message: "What's your file name?",
            default: getEndpointName(endPoint),
        });
        const testData = swaggerUrl &&
            (await (0, auto_generic_swagger_1.genericTypes)({
                swaggerUrl,
                apiPath: endPoint,
                method,
                fileName,
                moduleName,
            }));
        (0, generic_api_1.createApiFile)({
            moduleName,
            apiDomain,
            endPoint: convertApiUrl(endPoint),
            fileName,
            method,
            typeValue: testData,
            shouldCreateHook: option === "hook" || option === "both",
            shouldCreateAPI: option === "api" || option === "both",
        });
    }
    catch (error) {
        console.log(error);
    }
}
// (async () => {
//   try {
//     const option = await select({
//       message: "Select the option?",
//       choices: [
//         {
//           name: "Create API",
//           value: "api",
//         },
//         {
//           name: "Create Hook",
//           value: "hook",
//         },
//         {
//           name: "Create API & Hook",
//           value: "both",
//         },
//       ],
//     });
//     const moduleDataList = getModuleData();
//     const apiDomain = await search({
//       message: "What's your domain?",
//       pageSize: 20,
//       source: async (input, { signal }) => {
//         if (!input) {
//           return moduleDataList.map((item) => ({
//             name: item.path,
//             value: item.path,
//             description: `Module name: ${item.name}`,
//           }));
//         }
//         const data = moduleDataList
//           .filter((item) => item?.path?.includes(input || ""))
//           .map((item) => ({
//             name: item.path,
//             value: item.path,
//             description: `Module name: ${item.name}`,
//           }));
//         if (data.length > 0) {
//           return data;
//         }
//         return [
//           {
//             name: input,
//             value: input,
//           },
//         ];
//       },
//     });
//     let moduleName = moduleDataList.find(
//       (item) => item.path === apiDomain
//     )?.name;
//     const swaggerUrl = await input({ message: "What's your swaggerUrl?" });
//     let endPoint = "";
//     if (swaggerUrl) {
//       const data = await fetchSwagger(swaggerUrl);
//       const pathList = Object.keys(data?.paths) || [];
//       endPoint = await search({
//         message: "What's your file the endpoint?",
//         pageSize: 20,
//         source: async (input, { signal }) => {
//           if (!input) {
//             return pathList.map((item) => ({
//               name: item,
//               value: item,
//             }));
//           }
//           const data = pathList.map((item) => ({
//             name: item,
//             value: item,
//           }));
//           if (data.length > 0) {
//             return data;
//           }
//           return [
//             {
//               name: input,
//               value: input,
//             },
//           ];
//         },
//       });
//     } else {
//       endPoint = await input({ message: "What's your file the endpoint?" });
//     }
//     const method = await select({
//       message: "Select a method",
//       choices: [
//         {
//           name: "GET",
//           value: "get",
//         },
//         {
//           name: "POST",
//           value: "post",
//         },
//         {
//           name: "PUT",
//           value: "put",
//         },
//         {
//           name: "PATCH",
//           value: "patch",
//         },
//         {
//           name: "DELETE",
//           value: "delete",
//         },
//       ],
//     });
//     if (!moduleName) {
//       const moduleRecommended = getModuleNameFromUrl(apiDomain);
//       moduleName = await search({
//         message: "What's your module?",
//         pageSize: 20,
//         source: async (input, { signal }) => {
//           if (!input) {
//             return [
//               {
//                 name: moduleRecommended,
//                 value: moduleRecommended,
//               },
//             ];
//           }
//           const data = moduleDataList
//             .filter((item) => item?.name?.includes(input || ""))
//             .map((item, index) => ({
//               name: item.name,
//               value: item.name,
//             }));
//           if (data.length > 0) {
//             return data;
//           }
//           return [
//             {
//               name: input,
//               value: input,
//             },
//           ];
//         },
//       });
//     }
//     const fileName = await input({
//       message: "What's your file name?",
//       default: getEndpointName(endPoint),
//     });
//     const testData =
//       swaggerUrl &&
//       (await genericTypes({
//         swaggerUrl,
//         apiPath: endPoint,
//         method,
//         fileName,
//         moduleName,
//       }));
//     createApiFile({
//       moduleName,
//       apiDomain,
//       endPoint: convertApiUrl(endPoint),
//       fileName,
//       method,
//       typeValue: testData,
//       shouldCreateHook: option === "hook" || option === "both",
//       shouldCreateAPI: option === "api" || option === "both",
//     });
//   } catch (error) {
//     console.log(error);
//   }
// })();
