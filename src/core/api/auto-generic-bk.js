const { createApiFile } = require('./create-api');

let data = {};
const methodTypeOne = ['get', 'delete'];
const parameterBlackList = ['authorization'];
const joinFieldList = ['body'];
const typeMap = {
  string: 'string',
  integer: 'number',
  boolean: 'boolean',
  number: 'number',
};

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
        typeData.push(`${nameText}${getTypeDefinitions(value.items.$ref, level + 1)}[];`);
        continue;
      }
    }

    if (type === 'object' && value?.properties) {
      const objectProperties = convertProperties(value?.properties, 1);
      typeData.push(...objectProperties);
    }

    if (value?.$ref) {
      typeData.push(`${nameText}${getTypeDefinitions(value.$ref, level + 1)};`);
      continue;
    }

    if (typeMap[value.type]) {
      typeData.push(`${nameText}${typeMap[value.type] || 'any'};`);
    }
  }
  return typeData;
};

const getTypeDefinitions = (ref = '', level = 1, isAppend = false) => {
  if (!ref) return;
  const schemaName = ref.split('/').pop() || '';
  const schemaData = data?.definitions?.[schemaName];
  if (typeMap?.[schemaData?.type]) {
    return `${typeMap?.[schemaData?.type]}`;
  }

  const properties = data?.definitions?.[schemaName]?.properties;

  if (!properties) {
    return 'any';
  }

  const spaces = getIndentation(level);

  const typeData = convertProperties(properties, level);

  if (isAppend) {
    return `${spaces}${typeData.join(`\n${spaces}`)}\n${spaces}`;
  }

  return `{\n${spaces}${typeData.join(`\n${spaces}`)}\n${spaces}}`;
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
  return `{\n${spaces}${typeData.join(`\n${spaces}`)}\n}`;
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
  return `{\n${spaces}${typeData.join(`\n${spaces}`)}\n}`;
};

async function fetchSwagger(swaggerUrl = '') {
  const response = await fetch(swaggerUrl);
  return response.json();
}

function extractModuleName(url) {
  const match = url.match(/pmc-ecm-(.*?)\-api-golang\.develop\.pharmacity\.io/);
  return match ? match[1] : null;
}

function convertApiUrl(url) {
  return url.replace(/^\/api\//, '').replace(/{(.*?)}/g, ':$1');
}

function getApiDomain(url) {
  const regex = /https:\/\/(.*?)-api-golang\.develop\.pharmacity\.io/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

const genericTypes = async ({ swaggerUrl, apiPath, method = 'get', fileName }) => {
  data = await fetchSwagger(swaggerUrl);
  const apiInfo = data?.paths?.[apiPath];
  const firstValue = apiInfo?.[method];
  let paramValue = '';
  if (methodTypeOne.includes(method)) {
    paramValue = convertSwaggerToTS(firstValue?.parameters);
  } else {
    paramValue = convertSwaggerToTSForOther(firstValue?.parameters);
  }
  const responseValue = `${getTypeDefinitions(firstValue?.responses?.['200']?.schema?.$ref)}`;
  const moduleName = extractModuleName(swaggerUrl);
  const endPoint = convertApiUrl(apiPath);
  console.log('responseValue', responseValue);
  createApiFile({
    moduleName,
    fileName: fileName || method,
    endPoint,
    method: method.toUpperCase(),
    shouldCreateHook: 'false',
    apiDomain: getApiDomain(swaggerUrl),
    paramValue: paramValue,
    responseValue: responseValue,
  });
};

genericTypes({
  swaggerUrl:
    'https://pmc-ecm-cart-api-golang.develop.pharmacity.io/q/service/pmc.ecm.cart.cart.Cart',
  apiPath: '/api/cart/internal/checkout',
  method: 'post',
  fileName: 'internal-checkout',
});
