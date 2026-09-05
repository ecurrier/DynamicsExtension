import { Spinner } from '@fluentui/react-components'
import { Suspense } from 'react'

import { type AreaDefinition } from '@/modules'
import { PageRequirementGate } from '@/shared/components'

interface AreaOutletProps {
  area: AreaDefinition
}

export const AreaOutlet = ({ area }: AreaOutletProps) => {
  const Component = area.component
  const content = (
    <Suspense fallback={<Spinner style={{ padding: '24px' }} />}>
      <Component />
    </Suspense>
  )
  return area.requires ? <PageRequirementGate requires={area.requires}>{content}</PageRequirementGate> : content
}
