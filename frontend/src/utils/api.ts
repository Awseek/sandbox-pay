const BASE = '/api'

interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
}

function getToken(): string | null {
  return localStorage.getItem('token')
}

export function setToken(token: string) {
  localStorage.setItem('token', token)
}

export function clearToken() {
  localStorage.removeItem('token')
}

async function request<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const json: ApiResponse<T> = await res.json()

  if (json.code !== 200) {
    throw new Error(json.msg || 'Request failed')
  }
  return json.data
}

export const api = {
  get<T = unknown>(path: string) {
    return request<T>(path)
  },
  post<T = unknown>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  },
  put<T = unknown>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  },
  del<T = unknown>(path: string) {
    return request<T>(path, { method: 'DELETE' })
  },
}
