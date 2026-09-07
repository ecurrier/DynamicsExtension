import { defineHandlers } from '@/messaging/page'
import {
  type AttributeMetadataRecord,
  fetchAllOptionSetAttributes,
  fetchJson,
  getFormContext,
  getPageKind,
  labelText,
  type OptionSetMetadata,
  requireModelDrivenApp,
} from '@/page/xrm'
import { type ChoiceMetadata, type ChoiceOption, type ChoiceSet } from '@/shared/types'

const toChoiceOptions = (options: (OptionSetMetadata['Options'] | undefined) | undefined): ChoiceOption[] =>
  (options ?? []).map((option) => ({ value: option.Value, label: labelText(option.Label) ?? String(option.Value) }))

const toChoiceSet = (name: string | null, scope: string, options: ChoiceOption[]): ChoiceSet | null =>
  name ? { name, scope, options } : null

const collectEntityChoices = (entityName: string, attributes: AttributeMetadataRecord[]): ChoiceSet[] =>
  attributes.flatMap((attribute) => {
    const name = labelText(attribute.DisplayName)
    const options =
      attribute.AttributeType === 'Boolean'
        ? toChoiceOptions(
            [attribute.OptionSet?.FalseOption, attribute.OptionSet?.TrueOption].filter((option) => !!option),
          )
        : toChoiceOptions(attribute.OptionSet?.Options)
    const choiceSet = toChoiceSet(name, entityName, options)
    return choiceSet ? [choiceSet] : []
  })

export const choiceMetadataHandlers = defineHandlers({
  'utilities.getChoiceMetadata': async (): Promise<ChoiceMetadata> => {
    requireModelDrivenApp()
    const globalOptionSets = await fetchJson<{ value: OptionSetMetadata[] }>('GlobalOptionSetDefinitions')
    const globalChoices = globalOptionSets.value
      .filter((optionSet) => optionSet.OptionSetType === 'Picklist')
      .flatMap((optionSet) => {
        const choiceSet = toChoiceSet(labelText(optionSet.DisplayName), 'global', toChoiceOptions(optionSet.Options))
        return choiceSet ? [choiceSet] : []
      })
    if (getPageKind() !== 'form') {
      return { entityName: null, choices: globalChoices }
    }
    const entityName = getFormContext().data.entity.getEntityName()
    const entityChoices = collectEntityChoices(entityName, await fetchAllOptionSetAttributes(entityName))
    return { entityName, choices: [...entityChoices, ...globalChoices] }
  },
})
