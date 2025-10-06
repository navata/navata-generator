import { toCamelCase, capitalizeFirstLetter } from "./generic-api";

let data: any = {};
const generatedTypes = new Map<string, string>();
const methodTypeOne = ["get", "delete"];
const parameterBlackList = ["authorization"];
const joinFieldList = ["body"];
const typeMap: Record<string, string> = {
  string: "string",
  boolean: "boolean",
  number: "number",
};

const getNameSchema = (ref: string = ""): string => ref.split("/").pop() || "";

const convertToTypeName = (text: string): string => {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\W]+/g, " ")
    .split(" ")
    .map((word) => {
      return word.charAt(0) === word.charAt(0).toUpperCase()
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
};

const getTypeNameFromRef = (ref: string): string =>
  convertToTypeName(getNameSchema(ref));

function getIndentation(level: number, spaceCount: number = 1): string {
  return " ".repeat(level * spaceCount);
}

const removeFields = (parameters: any[]): any[] =>
  parameters.filter((param) => !parameterBlackList.includes(param.name));

const convertFieldName = (field: string): string => {
  return field.includes(".") ? field.split(".").pop() || "" : field;
};

const convertProperties = (
  properties: Record<string, any>,
  level: number
): string[] => {
  const typeData: string[] = [];
  const spaces = getIndentation(level);

  for (const [name, value] of Object.entries(properties)) {
    if (parameterBlackList.includes(name)) continue;

    const type = value.type;
    const nameText = `${spaces}${name}${value.required === false ? "?" : ""}: `;

    if (type === "array") {
      if (value?.items?.type) {
        typeData.push(`${nameText}${typeMap[value.items.type] || "any"}[];`);
        continue;
      }
      if (value?.items?.$ref) {
        const typeName = getTypeNameFromRef(value.items.$ref);
        console.log(typeName, value.items.$ref);
        typeData.push(`${nameText}${typeName}[];`);
        if (!generatedTypes.has(typeName)) {
          generatedTypes.set(
            typeName,
            `type ${typeName} = ${getTypeDefinitions(value.items.$ref, 1)}`
          );
        }
        continue;
      }
    }

    if (type === "object" && value?.properties) {
      const objectProperties = convertProperties(value.properties, 1);
      typeData.push(...objectProperties);
    }

    if (value?.$ref) {
      const typeName = getTypeNameFromRef(value.$ref);
      typeData.push(`${nameText}${typeName};`);
      if (!generatedTypes.has(typeName)) {
        generatedTypes.set(
          typeName,
          `type ${typeName} = ${getTypeDefinitions(value.$ref, 1)}`
        );
      }
      continue;
    }

    if (typeMap[type]) {
      typeData.push(`${nameText}${typeMap[type] || "any"};`);
    }
  }

  return typeData;
};

const getTypeDefinitions = (
  ref: string = "",
  level: number = 1,
  isAppend: boolean = false
): string => {
  if (!ref) return "";
  const schemaName = ref.split("/").pop() || "";
  const schemaData = data?.definitions?.[schemaName];

  if (schemaData?.type === "integer" && schemaData?.enum) {
    return schemaData.enum.join(" | ") + ";";
  }

  if (typeMap?.[schemaData?.type]) {
    return `${typeMap[schemaData.type]} `;
  }

  const properties = data?.definitions?.[schemaName]?.properties;

  if (!properties) {
    return "any";
  }

  const spaces = getIndentation(level);
  const typeData = convertProperties(properties, level);

  if (isAppend) {
    return `${spaces}${typeData.join(`\n${spaces}`)} \n${spaces} `;
  }

  return `{ \n${spaces}${typeData.join(`\n${spaces}`)} \n${spaces} } `;
};

const convertSwaggerToTS = (parameters: any[] = []): string => {
  const interfaceFields = parameters.filter(
    (param) => !parameterBlackList.includes(param.name)
  );
  if (!interfaceFields.length) return "";

  const objectFields = interfaceFields.reduce((acc, item) => {
    return { ...acc, [item.name]: item };
  }, {} as Record<string, any>);

  const typeData = convertProperties(objectFields, 0);
  const spaces = getIndentation(1);
  return `{ \n${spaces}${typeData.join(`\n${spaces}`)} \n } `;
};

const convertSwaggerToTSForOther = (parameters: any[] = []): string => {
  const objectFields = removeFields(parameters).reduce((acc, item) => {
    if (joinFieldList.includes(item.name)) {
      if (item?.schema?.properties) {
        return {
          ...acc,
          ...item.schema.properties,
        };
      }
      if (item?.schema?.$ref) {
        const schemaName = item.schema.$ref.split("/").pop() || "";
        return {
          ...acc,
          ...data?.definitions?.[schemaName]?.properties,
        };
      }
    }
    return {
      ...acc,
      [convertFieldName(item.name)]: item,
    };
  }, {} as Record<string, any>);

  const typeData = convertProperties(objectFields, 0);
  const spaces = getIndentation(1);
  return `{ \n${spaces}${typeData.join(`\n${spaces}`)} \n } `;
};

async function fetchSwagger(swaggerUrl: string = ""): Promise<any> {
  const response = await fetch(swaggerUrl);
  return response.json();
}

function extractModuleName(url: string): string | null {
  const match = url.match(
    /pmc-ecm-(.*?)-(?:api-golang|api)\.develop\.pharmacity\.io/
  );
  return match ? match[1] : null;
}

function convertApiUrl(url: string): string {
  return url.replace(/^\/api\//, "").replace(/{(.*?)}/g, ":$1");
}

function getApiDomain(url: string): string | null {
  const regex = /https:\/\/(.*?)-(?:api-golang|api)\.develop\.pharmacity\.io/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

interface GenericTypesParams {
  swaggerUrl: string;
  apiPath: string;
  method?: string;
  fileName: string;
  moduleName?: string;
}

const genericTypes = async ({
  swaggerUrl,
  apiPath,
  method = "get",
  fileName,
  moduleName,
}: GenericTypesParams): Promise<string> => {
  data = await fetchSwagger(swaggerUrl);
  const apiInfo = data?.paths?.[apiPath];

  if (!apiInfo) {
    console.log(`Api path not found`);
    return "";
  }

  const firstValue = apiInfo?.[method];

  if (!firstValue) {
    console.log(`Api method not found`);
    return "";
  }

  let paramValue = "";
  if (methodTypeOne.includes(method)) {
    paramValue = convertSwaggerToTS(firstValue?.parameters);
  } else {
    paramValue = convertSwaggerToTSForOther(firstValue?.parameters);
  }

  const responseValue = `${getTypeDefinitions(
    firstValue?.responses?.["200"]?.schema?.$ref
  )} `;
  const functionName = toCamelCase(`${moduleName}-${fileName}`);
  const typeFunctionName = capitalizeFirstLetter(functionName);
  const paramType = `${typeFunctionName}Param`;
  const responseType = `${typeFunctionName}ResponseData`;

  generatedTypes.set("ParamValue", `export type ${paramType} = ${paramValue} `);
  generatedTypes.set(
    "ResponseValue",
    `export type ${responseType} = ${responseValue} `
  );

  return Array.from(generatedTypes.values()).join("\n\n");
};

export { fetchSwagger, genericTypes };
