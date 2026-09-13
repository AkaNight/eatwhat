export class DataServiceError extends Error {
  readonly code?: string
  readonly cause?: unknown

  constructor(message: string, options?: { code?: string; cause?: unknown }) {
    super(message)
    this.name = 'DataServiceError'
    this.code = options?.code
    this.cause = options?.cause
  }
}
