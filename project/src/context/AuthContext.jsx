import { createContext, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import "../utils/api";

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

  const clearSession = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    let ignore = false;
    const loadUser = async () => {
      if (token) {
        try {
          const response = await axios.get("/api/auth/user");
          if (ignore) return;
          setUser(response.data);
        } catch (error) {
          console.error("Error loading user:", error);
          // Only drop the session when the token is actually rejected, not on
          // network errors or server cold starts.
          const status = error.response?.status;
          if (!ignore && (status === 401 || status === 403)) clearSession();
        }
      }
      if (!ignore) setIsLoading(false);
    };

    loadUser();
    return () => {
      ignore = true;
    };
  }, [token]);

  // Any authenticated request rejected with 401 means the token expired/was revoked.
  useEffect(() => {
    if (!token || !axios.interceptors?.response) return undefined;
    const id = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const sentAuth = error.config?.headers?.Authorization;
        if (error.response?.status === 401 && sentAuth) {
          toast.error("Session expired. Please log in again.");
          clearSession();
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, [token]);

  const saveSession = (data) => {
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  // login/register throw on failure so callers can show the server's message.
  const login = async (email, password) => {
    const response = await axios.post("/api/auth/login", {
      email,
      password,
    });
    saveSession(response.data);
  };

  const register = async (name, email, password) => {
    const response = await axios.post("/api/auth/register", {
      name,
      email,
      password,
    });
    saveSession(response.data);
  };

  const logout = clearSession;

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
