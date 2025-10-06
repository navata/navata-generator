const { createApiFile, toCamelCase, capitalizeFirstLetter } = require('./generic-api');

let data = {};
const generatedTypes = new Map();
const methodTypeOne = ['get', 'delete'];
const parameterBlackList = ['authorization'];
const joinFieldList = ['body'];
const typeMap = {
  string: 'string',
  // integer: 'number',
  boolean: 'boolean',
  number: 'number',
};

const getNameSchema = (ref = '') => ref.split('/').pop() || '';

const convertToTypeName = (text) => {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Tách camelCase → camel Case
    .replace(/[_\W]+/g, ' ') // Thay thế dấu _ hoặc ký tự đặc biệt thành khoảng trắng
    .split(' ') // Tách thành mảng từ
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Viết hoa chữ cái đầu
    .join(''); // Nối lại thành PascalCase
};

const getTypeNameFromRef = (ref) => convertToTypeName(getNameSchema(ref));

function getIndentation(level, spaceCount = 1) {
  return ' '.repeat(level * spaceCount);
}

const removeFields = (parameters) =>
  parameters.filter((param) => !parameterBlackList.includes(param.name));

const convertFieldName = (field) => {
  return field.includes('.') ? field.split('.').pop() || '' : field;
};

const convertProperties = (properties, level) => {
  const typeData = [];
  const spaces = getIndentation(level);
  for (const [name, value] of Object.entries(properties)) {
    if (parameterBlackList.includes(name)) continue;

    const type = value.type;
    const nameText = `${spaces}${name}${value.required === false ? '?' : ''}: `;

    if (type === 'array') {
      if (value?.items?.type) {
        typeData.push(`${nameText}${typeMap[value?.items?.type] || 'any'}[];`);
        continue;
      }
      if (value?.items?.$ref) {
        const typeName = getTypeNameFromRef(value.items.$ref);
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

    if (type === 'object' && value?.properties) {
      const objectProperties = convertProperties(value?.properties, 1);
      typeData.push(...objectProperties);
    }

    if (value?.$ref) {
      const typeName = getTypeNameFromRef(value.$ref);
      typeData.push(`${nameText}${typeName};`);
      if (!generatedTypes.has(typeName)) {
        generatedTypes.set(typeName, `type ${typeName} = ${getTypeDefinitions(value.$ref, 1)}`);
      }
      continue;
    }

    if (typeMap[type]) {
      typeData.push(`${nameText}${typeMap[value.type] || 'any'};`);
    }
  }
  return typeData;
};

const getTypeDefinitions = (ref = '', level = 1, isAppend = false) => {
  if (!ref) return;
  const schemaName = ref.split('/').pop() || '';
  const schemaData = data?.definitions?.[schemaName];

  if (schemaData?.type === 'integer' && schemaData?.enum) {
    return schemaData.enum.join(' | ') + ';';
  }

  if (typeMap?.[schemaData?.type]) {
    return `${typeMap?.[schemaData?.type]} `;
  }

  const properties = data?.definitions?.[schemaName]?.properties;

  if (!properties) {
    return 'any';
  }

  const spaces = getIndentation(level);

  const typeData = convertProperties(properties, level);

  if (isAppend) {
    return `${spaces}${typeData.join(`\n${spaces}`)} \n${spaces} `;
  }

  return `{ \n${spaces}${typeData.join(`\n${spaces}`)} \n${spaces} } `;
};

const convertSwaggerToTS = (parameters = []) => {
  const interfaceFields = parameters.filter((param) => !parameterBlackList.includes(param.name));
  if (!interfaceFields.length) return '';
  const objectFields = interfaceFields.reduce(
    (oldValue, item) => ({
      ...oldValue,
      [item.name]: item,
    }),
    {}
  );
  const typeData = convertProperties(objectFields, 0);
  const spaces = getIndentation(1);
  return `{ \n${spaces}${typeData.join(`\n${spaces}`)} \n } `;
};

const convertSwaggerToTSForOther = (parameters = []) => {
  const objectFields = removeFields(parameters).reduce((oldValue, item) => {
    if (joinFieldList.includes(item.name)) {
      // Array type
      if (item?.schema?.properties) {
        return {
          ...oldValue,
          ...item?.schema?.properties,
        };
      }
      // Object type
      if (item?.schema?.$ref) {
        const schemaName = item?.schema?.$ref.split('/').pop() || '';
        return {
          ...oldValue,
          ...data?.definitions?.[schemaName]?.properties,
        };
      }
    }
    return {
      ...oldValue,
      [convertFieldName(item.name)]: item,
    };
  }, {});

  const typeData = convertProperties(objectFields, 0);
  const spaces = getIndentation(1);
  return `{ \n${spaces}${typeData.join(`\n${spaces}`)} \n } `;
};

async function fetchSwagger(swaggerUrl = '') {
  const response = await fetch(swaggerUrl);
  return response.json();
}

function extractModuleName(url) {
  const match = url.match(/pmc-ecm-(.*?)-(?:api-golang|api)\.develop\.pharmacity\.io/);
  return match ? match[1] : null;
}

function convertApiUrl(url) {
  return url.replace(/^\/api\//, '').replace(/{(.*?)}/g, ':$1');
}

function getApiDomain(url) {
  const regex = /https:\/\/(.*?)-(?:api-golang|api)\.develop\.pharmacity\.io/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

const genericTypes = async ({ swaggerUrl, apiPath, method = 'get', fileName }) => {
  data = await fetchSwagger(swaggerUrl);
  const apiInfo = data?.paths?.[apiPath];

  if (!apiInfo) {
    console.log(`Api path not found`);
    return;
  }

  const firstValue = apiInfo?.[method];

  if (!firstValue) {
    console.log(`Api method not found`);
    return;
  }

  let paramValue = '';
  if (methodTypeOne.includes(method)) {
    paramValue = convertSwaggerToTS(firstValue?.parameters);
  } else {
    paramValue = convertSwaggerToTSForOther(firstValue?.parameters);
  }
  const responseValue = `${getTypeDefinitions(firstValue?.responses?.['200']?.schema?.$ref)} `;
  const moduleName = extractModuleName(swaggerUrl);
  const endPoint = convertApiUrl(apiPath);

  const functionName = toCamelCase(`${moduleName}-${fileName}`);
  const typeFunctionName = capitalizeFirstLetter(functionName);
  const paramType = `${typeFunctionName}Param`;
  const responseType = `${typeFunctionName}ResponseData`;

  generatedTypes.set('ParamValue', `export type ${paramType} = ${paramValue} `);
  generatedTypes.set('ResponseValue', `export type ${responseType} = ${responseValue} `);

  return Array.from(generatedTypes.values()).join('\n\n');
  // createApiFile({
  //   moduleName,
  //   fileName: fileName || method,
  //   endPoint,
  //   method: method.toUpperCase(),
  //   apiDomain: getApiDomain(swaggerUrl),
  //   typeValue: Array.from(generatedTypes.values()).join('\n\n'),
  //   shouldCreateHook: true,
  // });
};

// genericTypes({
//   swaggerUrl:
//     'https://pmc-ecm-auth-service-api.develop.pharmacity.io/q/service/pmc.ecm.service.authentication.account_manager.AccountManager',
//   // apiPath: '/api/cart/merge/{cart_id}',
//   apiPath: '/api/authentication/account/me',
//   method: 'get',
//   fileName: 'account-me',
// });

export { fetchSwagger, genericTypes }