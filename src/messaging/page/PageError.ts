export type PageErrorName =
  | 'NoFormContext'
  | 'NotModelDrivenApp'
  | 'NotSupported'
  | 'EntityNameNotFound'
  | 'NotFound'
  | 'InvalidArgument'
  | 'XrmError'
  | 'HttpError'

export class PageError extends Error {
  constructor(
    override readonly name: PageErrorName,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
  }
}
