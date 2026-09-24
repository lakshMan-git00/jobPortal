import axios from 'axios';

// Production requests use the same-origin proxy in vercel.json so the browser
// can read XSRF-TOKEN and send the HttpOnly session cookie on API requests.
const baseUrl = (
  import.meta.env.DEV
    ? import.meta.env.VITE_API_URL || 'http://localhost:8000'
    : window.location.origin
)
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');
export const apiClient = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
  withXSRFToken: true,
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;
  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0;
    if (status === 401 && !String(error.config?.url).includes('/auth/me'))
      window.dispatchEvent(new Event('auth-expired'));
    const errors = error.response?.data?.errors ?? {};
    const messages: Record<number, string> = {
      0: 'Unable to reach the server. Please try again.',
      401: 'Your session has ended. Please sign in again.',
      403: 'You do not have access to this action.',
      404: 'This item is no longer available.',
      419: 'Your session has expired. Refresh this page and try again.',
      429: 'Too many requests. Please wait a minute and try again.',
    };
    const message =
      status >= 500
        ? 'The service is temporarily unavailable. Please try again shortly.'
        : Object.values(errors).flat().join(' ') ||
          messages[status] ||
          error.response?.data?.message ||
          'Unable to complete your request.';
    return Promise.reject(new ApiError(message, status, errors));
  },
);
export async function csrf() {
  await apiClient.get('/sanctum/csrf-cookie');
}
export async function apiGet<T>(path: string): Promise<T> {
  return (await apiClient.get<T>(path)).data;
}
export async function apiSend<T = unknown>(
  path: string,
  method: string,
  data?: unknown,
): Promise<T> {
  return (await apiClient.request<T>({ url: path, method, data })).data;
}
export async function downloadResume(id: number, name: string) {
  const response = await apiClient.get(`/api/workspace/resumes/${id}/download`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
