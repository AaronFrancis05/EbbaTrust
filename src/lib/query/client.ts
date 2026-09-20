import { QueryClient } from '@tanstack/react-query';

/**
 * Query defaults tuned for Ugandan network conditions: connections are often slow,
 * intermittent, and metered. We retry more than usual, back off hard, and keep data
 * fresh for longer so a user on 3G is not refetching constantly. AGENTS.md §5.5.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Mutations here move money and submit legal requests. Never retry them
      // automatically — a retried escrow call could double-charge. Retry is an
      // explicit user action. AGENTS.md §4.5.
      retry: false,
    },
  },
});
