export const API_URL = (
  import.meta.env.VITE_BACKEND_URL || "https://blog-web-app-qbiy.onrender.com"
).replace(/\/$/, "");

export const getErrorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message || fallback;
