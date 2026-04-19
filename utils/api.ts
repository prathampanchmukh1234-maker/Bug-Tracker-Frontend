const rawApiBaseUrl = (import.meta as any).env.VITE_API_URL as string | undefined;

export const apiBaseUrl = (rawApiBaseUrl ?? '').replace(/\/+$/, '');

export function apiUrl(path: string) {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with "/": ${path}`);
  }

  if (!apiBaseUrl) {
    return path;
  }

  return `${apiBaseUrl}${path}`;
}
