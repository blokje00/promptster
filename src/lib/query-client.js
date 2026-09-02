import { QueryClient, QueryCache } from '@tanstack/react-query';
import { toast } from 'sonner';

// Dedupe: only one toast per query key per 30s window
const recentErrorToasts = new Map();
const TOAST_DEDUPE_MS = 30 * 1000;

export const queryClientInstance = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			const now = Date.now();
			// Prune stale entries so the Map doesn't grow unbounded over a long session
			for (const [staleKey, ts] of recentErrorToasts) {
				if (now - ts >= TOAST_DEDUPE_MS) recentErrorToasts.delete(staleKey);
			}
			// Queries can opt out of the global toast via meta.silent
			if (query.meta?.silent) return;
			const key = query.queryHash;
			const last = recentErrorToasts.get(key);
			if (last && now - last < TOAST_DEDUPE_MS) return;
			recentErrorToasts.set(key, now);
			console.error('[query]', query.queryKey, error);
			toast.error('Failed to load data. Please try again.');
		},
	}),
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
			// Cache query results so component remounts don't refetch immediately
			staleTime: 5 * 60 * 1000,
			gcTime: 30 * 60 * 1000,
		},
	},
});