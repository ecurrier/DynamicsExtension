import { formsModule } from './forms'
import { impersonationModule } from './impersonation'
import { pluginTracesModule } from './plugintraces'
import { securityModule } from './security'
import { settingsModule } from './settings'
import { templatesModule } from './templates'
import { type AreaDefinition, type ModuleDefinition } from './types'
import { utilitiesModule } from './utilities'
import { webApiModule } from './webapi'

export const modules: ModuleDefinition[] = [
  utilitiesModule,
  templatesModule,
  webApiModule,
  formsModule,
  securityModule,
  impersonationModule,
  pluginTracesModule,
  settingsModule,
].sort((left, right) => left.order - right.order)

export const areasById: Record<string, AreaDefinition> = Object.fromEntries(
  modules.flatMap((module) => module.areas.map((area) => [area.id, area])),
)

export const DEFAULT_AREA = 'utilities.admin'

export const resolveArea = (areaId: string | null | undefined): AreaDefinition =>
  areasById[areaId ?? ''] ?? (areasById[DEFAULT_AREA] as AreaDefinition)
