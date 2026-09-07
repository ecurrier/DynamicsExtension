export type DataverseOperationErrorCode = 'InvalidArgument' | 'NotFound' | 'NotSupported'

export class DataverseOperationError extends Error {
  readonly code: DataverseOperationErrorCode

  constructor(code: DataverseOperationErrorCode, message: string) {
    super(message)
    this.name = 'DataverseOperationError'
    this.code = code
  }
}

export const isNotFoundError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false
  }
  const candidate = error as { status?: unknown; details?: { status?: unknown } }
  return candidate.status === 404 || candidate.details?.status === 404
}
