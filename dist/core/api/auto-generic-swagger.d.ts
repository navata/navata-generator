declare function fetchSwagger(swaggerUrl?: string): Promise<any>;
interface GenericTypesParams {
    swaggerUrl: string;
    apiPath: string;
    method?: string;
    fileName: string;
    moduleName?: string;
}
declare const genericTypes: ({ swaggerUrl, apiPath, method, fileName, moduleName, }: GenericTypesParams) => Promise<string>;
export { fetchSwagger, genericTypes };
