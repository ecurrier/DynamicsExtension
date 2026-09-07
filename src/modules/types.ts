import { type FluentIcon } from '@fluentui/react-icons'
import { type ComponentType } from 'react'

import { type PageRequirement } from '@/shared/types'

export type AreaId = string

export interface AreaDefinition {
  id: AreaId
  label: string
  breadcrumb: string[]
  tooltip?: string
  requires?: PageRequirement
  component: ComponentType
}

export interface ModuleDefinition {
  id: string
  label: string
  icon: FluentIcon
  order: number
  areas: AreaDefinition[]
}
