import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080"
});

api.interceptors.request.use((config) => {
  // Student learning APIs use a separate session so they do not replace a teacher/admin session.
  const token = localStorage.getItem("token") || localStorage.getItem("student_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    // ERP writes and payment flows should show their API error in-place. A rejected
    // save must not erase a still-usable session and throw the user back to login.
    const isSensitiveWorkflow = /\/api\/(erp|payment\/school-fee|student-directory)\//.test(error.config?.url || "");
    if (status === 401 && !error.config?._skipAuthRedirect && !isSensitiveWorkflow) {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(error);
  }
);

export default api;
