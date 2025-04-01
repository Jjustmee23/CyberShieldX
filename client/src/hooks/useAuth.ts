import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/api";
import { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          localStorage.removeItem("auth_token");
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        localStorage.removeItem("auth_token");
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoggingIn(true);
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });
      
      const data = await response.json();
      localStorage.setItem("auth_token", data.token);
      setUser(data.user);
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${data.user.name || username}!`,
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setUser(null);
    
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isLoggingIn,
    login,
    logout,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
