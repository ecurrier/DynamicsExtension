import { type SolutionLayer, type SolutionLayerRequest, type SolutionLayers } from '@/shared/types'

import { DataverseOperationError } from './errors'
import { requireGuid } from './guards'
import { type DataverseHttp } from './http'
import { odataStringLiteral } from '../odata'

const COMPONENT_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,63}$/
const UNMANAGED_SOLUTION_NAME = 'Active'

interface ComponentLayerRecord {
  msdyn_name?: string | null
  msdyn_solutionname?: string | null
  msdyn_publishername?: string | null
  msdyn_order?: number | null
  msdyn_ismanaged?: boolean | null
  msdyn_solutionversion?: string | null
  msdyn_changedon?: string | null
  msdyn_overwritetime?: string | null
}

const describe = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason))

const requireComponentName = (value: string): string => {
  if (!COMPONENT_NAME_PATTERN.test(value)) {
    throw new DataverseOperationError('InvalidArgument', 'The solution component name is not valid')
  }
  return value
}

const isManagedLayer = (record: ComponentLayerRecord): boolean => {
  if (typeof record.msdyn_ismanaged === 'boolean') {
    return record.msdyn_ismanaged
  }
  return record.msdyn_solutionname !== UNMANAGED_SOLUTION_NAME
}

const toLayer = (record: ComponentLayerRecord, index: number): SolutionLayer => ({
  order: record.msdyn_order ?? index,
  solutionName: record.msdyn_solutionname ?? 'Unknown solution',
  publisherName: record.msdyn_publishername ?? null,
  isManaged: isManagedLayer(record),
  version: record.msdyn_solutionversion ?? null,
  changedOn: record.msdyn_changedon ?? record.msdyn_overwritetime ?? null,
})

export interface SolutionLayerOperations {
  getSolutionLayers: (request: SolutionLayerRequest) => Promise<SolutionLayers>
}

export const solutionLayerOperations = (http: DataverseHttp): SolutionLayerOperations => ({
  getSolutionLayers: async ({ componentId, solutionComponentName }) => {
    const id = requireGuid(componentId, 'Component')
    const componentName = requireComponentName(solutionComponentName)
    const path =
      'msdyn_componentlayers?$filter=' +
      `msdyn_solutioncomponentname eq ${odataStringLiteral(componentName)} and msdyn_componentid eq ${odataStringLiteral(id)}`

    let rows: ComponentLayerRecord[] = []
    let unavailable: string | null = null
    try {
      const response = await http.get<{ value?: ComponentLayerRecord[] }>(path)
      rows = response?.value ?? []
    } catch (error) {
      unavailable = describe(error)
    }

    const layers = rows
      .map(toLayer)
      .sort((left, right) => left.order - right.order)
      .map((layer, index) => ({ ...layer, order: index + 1 }))

    return {
      componentId: id,
      solutionComponentName: componentName,
      componentName: rows[0]?.msdyn_name ?? null,
      layers,
      hasUnmanagedLayer: layers.some((layer) => !layer.isManaged),
      unavailable,
    }
  },
})
