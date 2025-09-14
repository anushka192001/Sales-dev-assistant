"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from 'js-cookie';

type User = {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  register: (userData: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check for authenticated user on mount
    const storedUser = localStorage.getItem("user");
    const authCookie = Cookies.get('auth');
    
    if (storedUser && authCookie) {
      setUser(JSON.parse(storedUser));
    } else {
      // Clear any inconsistent state
      localStorage.removeItem("user");
      Cookies.remove('auth');
    }
  }, []);

  const login = async (email: string) => {
    const registrationData = localStorage.getItem("registrationData");
    if (!registrationData) {
      throw new Error("User not found");
    }

    const registrations = JSON.parse(registrationData);
    const userData = registrations.find((user: User) => user.email === email);
    
    if (!userData) {
      throw new Error("Invalid credentials");
    }

    const user = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      companyName: userData.companyName,
    };
    
    setUser(user);
    localStorage.setItem("user", JSON.stringify(user));
    // Set auth cookie with 7 days expiry
    Cookies.set('auth', 'true', { expires: 7 });
    router.push("/dashboard");
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    Cookies.remove('auth');
    router.push("/auth/login");
  };

  const register = async (userData: User) => {
    // Get existing registration data array or initialize if none exists
    const existingData = localStorage.getItem("registrationData");
    const registrations = existingData ? JSON.parse(existingData) : [];
    
    // Check if user with same email already exists
    if (registrations.some((user: User) => user.email === userData.email)) {
      throw new Error("User with this email already exists");
    }
    
    // Add new user to array
    registrations.push(userData);
    
    // Save updated array back to localStorage
    localStorage.setItem("registrationData", JSON.stringify(registrations));
    router.push("/auth/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}