export type DataverseOperationErrorCode = 'InvalidArgument' | 'NotFound' | 'NotSupported'

export class DataverseOperationError extends Error {
  readonly code: DataverseOperationErrorCode

  constructor(code: DataverseOperationErrorCode, message: string) {
    super(message)
    this.name = 'DataverseOperationError'
    this.code = code
  }
}
