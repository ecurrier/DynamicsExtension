import { Breadcrumb, BreadcrumbButton, BreadcrumbDivider, BreadcrumbItem, Tooltip } from '@fluentui/react-components'
import { Info16Regular } from '@fluentui/react-icons'
import { Fragment } from 'react'

interface AreaBreadcrumbProps {
  path: string[]
  tooltip?: string
}

export const AreaBreadcrumb = ({ path, tooltip }: AreaBreadcrumbProps) => (
  <Breadcrumb size="medium" aria-label="Current area">
    {path.map((segment, index) => {
      const last = index === path.length - 1
      return (
        <Fragment key={`${segment}-${index}`}>
          <BreadcrumbItem>
            <BreadcrumbButton current={last}>{segment}</BreadcrumbButton>
          </BreadcrumbItem>
          {last ? null : <BreadcrumbDivider />}
        </Fragment>
      )
    })}
    {tooltip ? (
      <BreadcrumbItem>
        <Tooltip content={tooltip} relationship="description">
          <Info16Regular aria-label="Area description" />
        </Tooltip>
      </BreadcrumbItem>
    ) : null}
  </Breadcrumb>
)
