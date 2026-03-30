import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { client } from "@/lib/api";

interface UserProfile {
  id: number;
  user_id: string;
  display_name: string;
  avatar_url: string;
  credits: number;
  plan: string;
  email?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const profileRes = await client.apiCall.invoke({
        url: "/api/v1/profile/me",
        method: "GET",
        data: {},
      });
      if (profileRes?.data && !profileRes.data.error) {
        return profileRes.data;
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
    return null;
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const authRes = await client.auth.me();
      if (authRes?.data) {
        const profile = await fetchProfile();
        if (profile) {
          setUser({
            ...profile,
            email: authRes.data.email,
          });
        } else {
          // Fallback: user is authenticated but no profile yet
          setUser({
            id: 0,
            user_id: authRes.data.id || "",
            display_name: authRes.data.email?.split("@")[0] || "User",
            avatar_url: "",
            credits: 25,
            plan: "free",
            email: authRes.data.email,
          });
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async () => {
    await client.auth.toLogin();
  };

  const logout = async () => {
    await client.auth.logout();
    setUser(null);
  };

  const refreshProfile = async () => {
    const profile = await fetchProfile();
    if (profile) {
      setUser((prev) => (prev ? { ...prev, ...profile } : null));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}