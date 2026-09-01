const API_BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // keep status text
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

export function mediaUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE}${path}`;
}

export async function upload<T>(path: string, body: FormData): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    body,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const parsed = (await response.json()) as { error?: string };
      if (parsed.error) {
        message = parsed.error;
      }
    } catch {
      // keep status text
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}
