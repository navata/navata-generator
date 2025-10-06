import { PmcHelloResponseData, PmcHelloParam } from '@/types/pmc/hello';
import { pmcApi } from '@/consts/api-paths';
import { RequestTypeDynamic } from '@/utils/apiService/types';
import { sendRequest } from '@/utils/apiService';

const url = `${pmcApi}/ax/hello`;

export const pmcHello = async (args: RequestTypeDynamic<PmcHelloParam>) => {
  
  return await sendRequest<any, PmcHelloResponseData>({
    config: {
      url,
      method: 'GET',
    },
    payload: args.payload,
  });
};
