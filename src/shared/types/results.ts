export interface ResultsShare {
  id: string
  entityName: string
  columns: string[]
  rows: Record<string, unknown>[]
  truncated: boolean
  createdAt: string
}
