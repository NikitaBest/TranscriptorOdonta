import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiUrl } from "./api/config";
import { ApiClient } from "./api/client";

/**
 * Устаревшая функция - используйте ApiClient напрямую
 * @deprecated Используйте ApiClient из lib/api/client.ts
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = url.startsWith('http') ? url : getApiUrl(url);
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // queryKey[0] - это путь API
    const path = queryKey[0] as string;
    const fullUrl = path.startsWith('http') ? path : getApiUrl(path);
    
    const res = await fetch(fullUrl, {
      credentials: "include",
      headers: {
        'Authorization': `Bearer ${ApiClient.getAuthToken() || ''}`,
      },
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    if (!res.ok) {
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }

    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Убираем дефолтный queryFn, чтобы использовать кастомные функции в useQuery
      // queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 секунд вместо Infinity
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
