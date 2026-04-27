import { createContext, useContext, useState, useEffect } from "react";
import { api, refreshSession } from "@/lib/api";

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
        // Try to refresh server-side session once before forcing logout.
        if ((error?.status === 401 || error?.status === 403) && mounted) {
          try {
            await refreshSession();
            const retried = await api("/auth/me");
            if (mounted) setUser(retried.user);
          } catch (refreshErr) {
            // If refresh fails, clear user.
            if (mounted) setUser(null);
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
    setUser(null);
  };

  const requestPasswordReset = async (email) => {
    try {
      const response = await api("/auth/forgot", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      return { error: null, data: response };
    } catch (err) {
      return { error: err };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const response = await api("/auth/reset", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setUser(response.user);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const socialLogin = async (provider, email, name) => {
    try {
      const response = await api("/auth/social", {
        method: "POST",
        body: JSON.stringify({ provider, email, name }),
      });
      setUser(response.user);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const updateCurrentUser = (nextUser) => {
    setUser(nextUser || null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        signIn,
        signUp,
        signOut,
        socialLogin,
        requestPasswordReset,
        resetPassword,
        updateCurrentUser,
        isAuthenticated: !!user,
        loading,
      }}
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
