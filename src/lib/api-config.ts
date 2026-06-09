import { Capacitor } from "@capacitor/core";

export const getApiBaseUrl = () => {
  if (Capacitor.isNativePlatform()) {
    // Replace with your actual deployed backend URL
    return import.meta.env.VITE_API_BASE_URL || "https://your-deployed-app.com";
  }
  return "";
};
