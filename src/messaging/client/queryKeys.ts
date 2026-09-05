import { type CommandArgs, type CommandName } from '@/messaging/contract'

export const pageKeys = {
  all: ['page'] as const,
  tab: (tabId: number) => ['page', tabId] as const,
  command: <N extends CommandName>(tabId: number, name: N, args: CommandArgs<N> | null) =>
    ['page', tabId, name, args ?? null] as const,
}

export const storageKeys = {
  all: ['storage'] as const,
  item: (key: string) => ['storage', key] as const,
}

export const permissionKeys = {
  all: ['permissions'] as const,
  host: (origin: string | null) => ['permissions', 'host', origin] as const,
}
