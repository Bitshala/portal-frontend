import {
  MutationCache,
  QueryCache,
  QueryClient,
  type QueryClientConfig,
} from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { getAxiosRequestHostname, isNetworkError } from '../utils/errorUtils.ts';

const defaultRetryDelay = (failureCount: number) =>
  Math.min(1000 * 2 ** failureCount, 30000);

export const createQueryClient = () => {
  const failedRequestsCache = new Map<string, boolean>();

  const queryClientConfig: QueryClientConfig =
    {
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          staleTime: 1000 * 60 * 5, // 5 minutes — avoid refetching on navigation
          gcTime: 1000 * 60 * 15, // 15 minutes — keep cache around
          retryOnMount: false, // don't auto-retry a failed query just because a component remounts
          retryDelay: (failureCount, error) =>
            isNetworkError(error as AxiosError)
              ? Math.min(2500 * 2 ** failureCount, 30000)
              : defaultRetryDelay(failureCount),
          retry(failureCount, error) {
            if (axios.isAxiosError(error)) {
              const status = error.response?.status;
              if (status && status >= 400 && status < 500) {
                return false;
              }
            }
            return failureCount < 3;
          },
        },
      },
      queryCache: new QueryCache(),
      mutationCache: new MutationCache(),
    } as QueryClientConfig;

  const queryClient: QueryClient = new QueryClient(queryClientConfig);

  const refreshData = (requestHost: string) => {
    failedRequestsCache.delete(requestHost);
    queryClient?.invalidateQueries();
  };

  axios.interceptors.response.use(
    (response) => {
      const requestHost = getAxiosRequestHostname(response?.config);

      if (requestHost && failedRequestsCache.has(requestHost)) {
        refreshData(requestHost);
      }

      return response;
    },
    (error) => {
      if (axios.isAxiosError(error) && !isNetworkError(error)) {
        const requestHost = getAxiosRequestHostname(error.config);

        if (requestHost && failedRequestsCache.has(requestHost)) {
          refreshData(requestHost);
        }
      }

      return Promise.reject(error);
    },
  );

  return queryClient;
};
