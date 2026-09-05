import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  makeStyles,
  Switch,
  Text,
  tokens,
} from '@fluentui/react-components'

import { InfoTip, useAppToast } from '@/shared/components'

import { useExtensionSettings } from '../../hooks'
import { SETTING_DEFINITIONS, SETTING_SECTIONS } from '../../lib'

const useStyles = makeStyles({
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    paddingBottom: '12px',
  },
  title: {
    fontWeight: tokens.fontWeightSemibold,
  },
})

export const ExtensionSettingsArea = () => {
  const styles = useStyles()
  const toast = useAppToast()
  const { settings, setSetting } = useExtensionSettings()

  return (
    <Accordion multiple collapsible defaultOpenItems={[...SETTING_SECTIONS]}>
      {SETTING_SECTIONS.map((section) => (
        <AccordionItem key={section} value={section}>
          <AccordionHeader>{section}</AccordionHeader>
          <AccordionPanel>
            {SETTING_DEFINITIONS.filter((definition) => definition.section === section).map((definition) => (
              <div key={definition.key} className={styles.group}>
                <Text className={styles.title}>{definition.title}</Text>
                <Switch
                  checked={settings[definition.key]}
                  label={
                    <>
                      {definition.label}
                      <InfoTip content={definition.tooltip} />
                    </>
                  }
                  onChange={(_, data) => {
                    setSetting(definition.key, data.checked).catch((error: unknown) =>
                      toast.error('Could not save the setting', error),
                    )
                  }}
                />
              </div>
            ))}
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
