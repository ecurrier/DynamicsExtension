import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { type Environment } from '@/shared/storage'

import { type TargetOperations, targetKey, useTargetOperations } from './useTargetOperations'

export const useTargetMetadata = (target: Environment | null, logicalName: string | null) => {
  const targetOps = useTargetOperations(target)
  const targetId = target?.id ?? 'none'
  const metadata = useQuery({
    queryKey: targetKey(targetId, 'getEntityMetadata', { logicalName }),
    queryFn: () =>
      (targetOps as TargetOperations)().then((ops) => ops.getEntityMetadata({ logicalName: logicalName ?? '' })),
    enabled: targetOps !== null && logicalName !== null,
    staleTime: Infinity,
    retry: false,
  })
  const entities = useQuery({
    queryKey: targetKey(targetId, 'listEntities'),
    queryFn: () => (targetOps as TargetOperations)().then((ops) => ops.listEntities()),
    enabled: targetOps !== null,
    staleTime: Infinity,
    retry: false,
  })
  const entitySets = useMemo(
    () => Object.fromEntries((entities.data ?? []).map((entity) => [entity.logicalName, entity.entitySetName])),
    [entities.data],
  )
  return { targetOps, metadata, entities, entitySets }
}
