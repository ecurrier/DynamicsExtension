export interface ImpersonatedUser {
  id: string
  fullName: string
  azureAdObjectId: string | null
}

export type ImpersonationHeader = 'CallerObjectId' | 'MSCRMCallerID'

export interface ImpersonationState {
  tabId: number
  orgOrigin: string
  user: ImpersonatedUser
  header: ImpersonationHeader
  startedAt: string
}

export type ImpersonationStates = Record<string, ImpersonationState>

export interface StartImpersonationRequest {
  tabId: number
  orgOrigin: string
  user: ImpersonatedUser
}
