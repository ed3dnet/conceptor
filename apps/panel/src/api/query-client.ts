import { QueryClient } from "@tanstack/react-query";

// Create a client with some sensible defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time of 5 minutes for most data
      staleTime: 5 * 60 * 1000,
      // Retry failed queries 1 time by default
      retry: 1,
      // Show stale data while revalidating
      refetchOnWindowFocus: true,
    },
  },
});
