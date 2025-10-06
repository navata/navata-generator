declare const toCamelCase: (str: string) => string;
declare const capitalizeFirstLetter: (str: string) => string;
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
export declare const createApiFile: ({ moduleName, fileName, endPoint, method, shouldCreateHook, apiDomain, typeValue, shouldCreateAPI, }: CreateApiFileParams) => void;
export { toCamelCase, capitalizeFirstLetter };
