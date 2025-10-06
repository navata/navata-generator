import { useSWRPmc } from '@/hooks/swr/useSWRPmc';
import { PmcHelloParam, PmcHelloResponseData } from '@/types/pmc/hello';
import { pmcHello } from '@/utils/api/pmc/hello';
import { ResponseData } from '@/utils/apiService/types';
import { SWRConfiguration } from 'swr';

export const usePmcHello = (
  params: PmcHelloParam,
  options?: SWRConfiguration<ResponseData<PmcHelloResponseData>>
) => 
  useSWRPmc(
    params ? { key: 'usePmcHello', params } : null,
    async ({ params }) => await pmcHello({ payload: params }),
    options
  );
