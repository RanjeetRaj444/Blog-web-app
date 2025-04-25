import { createContext, useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../utils/constants";

export const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const config = {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          };

          const response = await axios.get(`${API_URL}/api/auth/user`, config);
          setUser(response.data);
        } catch (error) {
          console.error("Error loading user:", error);
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, [token]);

  // Login user
  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });
      localStorage.setItem("token", response.data.token);
      setToken(response.data.token);
      setUser(response.data.user);
    } catch (error) {
      console.log(error);
    }
  };

  // Register user
  const register = async (name, email, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        name,
        email,
        password,
      });
      localStorage.setItem("token", response.data.token);
      setToken(response.data.token);
      setUser(response.data.user);
    } catch (error) {
      console.log(error);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
