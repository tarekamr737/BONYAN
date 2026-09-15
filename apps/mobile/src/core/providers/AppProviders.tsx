import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthSessionProvider, useAuthSession } from "../auth/session";

const queryDefaults = {
  queries: {
    retry: 1,
    staleTime: 30_000,
  },
} as const;

function SessionQueries({ children }: PropsWithChildren) {
  const { accessToken } = useAuthSession();
  // A session change must replace all private cached data, even for the same route.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queryClient = useMemo(() => new QueryClient({defaultOptions: queryDefaults}), [accessToken]);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <AuthSessionProvider>
        <SessionQueries>{children}</SessionQueries>
      </AuthSessionProvider>
    </SafeAreaProvider>
  );
}
