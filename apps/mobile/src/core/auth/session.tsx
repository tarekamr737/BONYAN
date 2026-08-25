import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuthSession = {
  accessToken: string | null;
  isAuthenticated: boolean;
  setAccessToken: (token: string | null) => void;
};

let currentAccessToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

const AuthSessionContext = createContext<AuthSession | null>(null);

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setSessionAccessToken(token: string | null): void {
  currentAccessToken = token;
  listeners.forEach((listener) => listener(token));
}

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessToken] = useState(currentAccessToken);

  useEffect(() => {
    listeners.add(setAccessToken);
    return () => {
      listeners.delete(setAccessToken);
    };
  }, []);

  const session = useMemo<AuthSession>(
    () => ({
      accessToken,
      isAuthenticated: accessToken !== null,
      setAccessToken: setSessionAccessToken,
    }),
    [accessToken],
  );

  return (
    <AuthSessionContext.Provider value={session}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession(): AuthSession {
  const session = useContext(AuthSessionContext);
  if (!session) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }
  return session;
}
