import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
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