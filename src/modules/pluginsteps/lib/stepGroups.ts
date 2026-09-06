import { isGuid } from '@/shared/lib'
import { PLUGIN_STEP_MODE_LABELS, PLUGIN_STEP_STAGE_LABELS, type PluginStep } from '@/shared/types'

export type StepStateFilter = 'all' | 'enabled' | 'disabled'
export type TreeSelection = boolean | 'mixed'

export interface TypeGroup {
  key: string
  id: string | null
  name: string
  friendlyName: string | null
  steps: PluginStep[]
}

export interface AssemblyGroup {
  key: string
  id: string | null
  name: string
  version: string | null
  types: TypeGroup[]
}

export type ParsedTreeValue =
  { kind: 'assembly'; id: string } | { kind: 'type'; parent: string; id: string } | { kind: 'step'; id: string }

const UNKNOWN = 'unknown'

const keyOf = (id: string | null): string => id ?? UNKNOWN

export const assemblyValue = (assemblyKey: string): string => `assembly:${assemblyKey}`

export const typeValue = (assemblyKey: string, typeKey: string): string => `type:${assemblyKey}:${typeKey}`

export const stepValue = (id: string): string => `step:${id}`

export const parseTreeValue = (value: string): ParsedTreeValue | null => {
  const [kind, first, second] = value.split(':')
  if (kind === 'assembly' && first && second === undefined) {
    return { kind, id: first }
  }
  if (kind === 'type' && first && second) {
    return { kind, parent: first, id: second }
  }
  if (kind === 'step' && first && second === undefined) {
    return { kind, id: first }
  }
  return null
}

export const stageLabel = (stage: number): string => PLUGIN_STEP_STAGE_LABELS[stage] ?? `Stage ${stage}`

export const stepModeLabel = (mode: number): string => PLUGIN_STEP_MODE_LABELS[mode] ?? `Mode ${mode}`

export const stepSummary = (step: PluginStep): string =>
  `${step.messageName || 'Unknown message'}${step.primaryEntity ? ` of ${step.primaryEntity}` : ''} · ${stageLabel(step.stage)} · ${stepModeLabel(step.mode)}`

export const stepMatches = (step: PluginStep, filter: string): boolean => {
  const term = filter.trim().toLowerCase()
  if (!term) {
    return true
  }
  return [
    step.name,
    step.pluginTypeName,
    step.pluginTypeFriendlyName,
    step.messageName,
    step.primaryEntity,
    step.assemblyName,
    step.filteringAttributes,
  ].some((value) => value?.toLowerCase().includes(term))
}

const passesState = (step: PluginStep, state: StepStateFilter): boolean =>
  state === 'all' || (state === 'enabled') === step.enabled

const byName = <T extends { name: string }>(left: T, right: T): number =>
  left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })

export const groupPluginSteps = (steps: PluginStep[], filter: string, state: StepStateFilter): AssemblyGroup[] => {
  const assemblies = new Map<string, AssemblyGroup>()
  for (const step of steps) {
    if (!passesState(step, state) || !stepMatches(step, filter)) {
      continue
    }
    const assemblyKey = keyOf(step.assemblyId)
    let assembly = assemblies.get(assemblyKey)
    if (!assembly) {
      assembly = {
        key: assemblyKey,
        id: step.assemblyId,
        name: step.assemblyName,
        version: step.assemblyVersion,
        types: [],
      }
      assemblies.set(assemblyKey, assembly)
    }
    const typeKey = keyOf(step.pluginTypeId)
    let type = assembly.types.find((candidate) => candidate.key === typeKey)
    if (!type) {
      type = {
        key: typeKey,
        id: step.pluginTypeId,
        name: step.pluginTypeName,
        friendlyName: step.pluginTypeFriendlyName,
        steps: [],
      }
      assembly.types.push(type)
    }
    type.steps.push(step)
  }
  const groups = [...assemblies.values()].sort(byName)
  for (const group of groups) {
    group.types.sort(byName)
    for (const type of group.types) {
      type.steps.sort((left, right) => left.rank - right.rank || byName(left, right))
    }
  }
  return groups
}

const typeStepIds = (type: TypeGroup): string[] => type.steps.map((step) => step.id)

const assemblyStepIds = (assembly: AssemblyGroup): string[] => assembly.types.flatMap(typeStepIds)

export const visibleStepIds = (groups: AssemblyGroup[]): string[] => groups.flatMap(assemblyStepIds)

export const allGroupValues = (groups: AssemblyGroup[]): string[] =>
  groups.flatMap((group) => [assemblyValue(group.key), ...group.types.map((type) => typeValue(group.key, type.key))])

export const stepIdsUnder = (groups: AssemblyGroup[], value: string): string[] => {
  const parsed = parseTreeValue(value)
  if (!parsed) {
    return []
  }
  if (parsed.kind === 'step') {
    return [parsed.id]
  }
  if (parsed.kind === 'assembly') {
    return groups.filter((group) => group.key === parsed.id).flatMap(assemblyStepIds)
  }
  return groups
    .filter((group) => group.key === parsed.parent)
    .flatMap((group) => group.types.filter((type) => type.key === parsed.id).flatMap(typeStepIds))
}

const selectionOf = (ids: string[], checked: Set<string>): TreeSelection => {
  const count = ids.filter((id) => checked.has(id)).length
  return count === 0 ? false : count === ids.length ? true : 'mixed'
}

export const treeCheckedItems = (groups: AssemblyGroup[], checked: Set<string>): [string, TreeSelection][] =>
  groups.flatMap((group) => [
    [assemblyValue(group.key), selectionOf(assemblyStepIds(group), checked)] as [string, TreeSelection],
    ...group.types.flatMap((type) => [
      [typeValue(group.key, type.key), selectionOf(typeStepIds(type), checked)] as [string, TreeSelection],
      ...type.steps.map((step) => [stepValue(step.id), checked.has(step.id)] as [string, TreeSelection]),
    ]),
  ])

const meaningfulFriendlyName = (friendlyName: string | null): string | null =>
  friendlyName && !isGuid(friendlyName.trim()) ? friendlyName : null

export const typeDisplayName = (type: Pick<TypeGroup, 'name' | 'friendlyName'>): string =>
  type.name || meaningfulFriendlyName(type.friendlyName) || 'Unknown type'

export const typeCaption = (type: Pick<TypeGroup, 'name' | 'friendlyName'>): string | null => {
  const friendly = meaningfulFriendlyName(type.friendlyName)
  return friendly && friendly !== type.name && type.name ? friendly : null
}
