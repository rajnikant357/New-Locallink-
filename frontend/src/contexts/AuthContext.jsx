import { createContext, useContext, useState, useEffect } from "react";
import { api, setAccessToken } from "@/lib/api";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const response = await api("/auth/me");
        if (mounted) {
          setUser(response.user);
        }
      } catch (error) {
        // Don't force-logout on temporary backend throttling/outage.
        if (error?.status === 401 || error?.status === 403) {
          setAccessToken(null);
          if (mounted) {
            setUser(null);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email, password) => {
    try {
      const response = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setAccessToken(response.accessToken);
      setUser(response.user);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const signUp = async (name, phone, email, password, type) => {
    try {
      const response = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, phone, email, password, type }),
      });

      setAccessToken(response.accessToken);
      setUser(response.user);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // Keep logout resilient even if the request fails.
    }
    setAccessToken(null);
    setUser(null);
  };

  const updateCurrentUser = (nextUser) => {
    setUser(nextUser || null);
  };

  return (
    <AuthContext.Provider
      value={{ user, signIn, signUp, signOut, updateCurrentUser, isAuthenticated: !!user, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
