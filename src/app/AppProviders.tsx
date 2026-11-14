import { Toaster } from "@fluentui/react-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useState } from "react";

import { AppCrashFallback, APP_TOASTER_ID, DialogProvider, ErrorBoundary, FailureBridge } from "@/shared/components";
import { ThemeProvider } from "@/shared/theme";

const createQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: { retry: false, refetchOnWindowFocus: false },
		},
	});

export const AppProviders = ({ children }: PropsWithChildren) => {
	const [queryClient] = useState(createQueryClient);
	return (
		<ThemeProvider>
			<QueryClientProvider client={queryClient}>
				<DialogProvider>
					{/*
					 * The backstop, for a crash above any one Area. It sits inside the providers so
					 * the fallback still has the theme and the toaster it needs to work.
					 */}
					<ErrorBoundary fallback={(error) => <AppCrashFallback error={error} />}>{children}</ErrorBoundary>
					<FailureBridge />
					<Toaster toasterId={APP_TOASTER_ID} position="bottom-end" limit={3} pauseOnHover />
				</DialogProvider>
			</QueryClientProvider>
		</ThemeProvider>
	);
};
