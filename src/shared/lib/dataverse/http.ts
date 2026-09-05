export type DataverseMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export interface DataverseHttp {
  origin: string
  apiUrl: string
  request<T>(method: DataverseMethod, path: string, body?: unknown, headers?: Record<string, string>): Promise<T>
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  patch(path: string, body: unknown): Promise<void>
  delete(path: string): Promise<void>
}

export interface DataverseHttpOptions {
  origin: string
  headers?: () => Promise<Record<string, string>> | Record<string, string>
  fetchImpl?: typeof fetch
}

export const WEB_API_VERSION = 'v9.2'

const errorMessage = (body: string): string | null => {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } }
    return parsed.error?.message ?? null
  } catch {
    return null
  }
}

export class DataverseHttpError extends Error {
  readonly status: number
  readonly body: string

  constructor(status: number, statusText: string, body: string) {
    super(errorMessage(body) ?? `${status} ${statusText}`.trim())
    this.name = 'DataverseHttpError'
    this.status = status
    this.body = body
  }
}

export const createDataverseHttp = ({ origin, headers, fetchImpl = fetch }: DataverseHttpOptions): DataverseHttp => {
  const apiUrl = `${origin}/api/data/${WEB_API_VERSION}/`
  const request = async <T>(
    method: DataverseMethod,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> => {
    const response = await fetchImpl(`${apiUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json; charset=utf-8' }),
        ...(await headers?.()),
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok) {
      throw new DataverseHttpError(response.status, response.statusText, await response.text())
    }
    if (response.status === 204) {
      return undefined as T
    }
    const text = await response.text()
    return (text ? JSON.parse(text) : undefined) as T
  }
  return {
    origin,
    apiUrl,
    request,
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
  }
}
