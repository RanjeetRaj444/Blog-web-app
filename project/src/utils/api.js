import axios from "axios";
import { API_URL } from "./constants";

// Adds the stored JWT to every request that doesn't already carry an
// Authorization header. Anonymous visitors send no Authorization header.
export const attachAuth = (config) => {
  let token = null;
  try {
    token = localStorage.getItem("token");
  } catch {
    // storage unavailable (private mode etc.)
  }
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

let configured = false;

// Configures the global axios instance once (base URL + auth header).
// Guarded with optional chaining because tests auto-mock axios.
export const setupApi = () => {
  if (configured) return;
  configured = true;
  if (axios.defaults) axios.defaults.baseURL = API_URL;
  axios.interceptors?.request?.use(attachAuth);
};

setupApi();

export default axios;
