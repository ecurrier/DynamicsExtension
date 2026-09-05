import { pluralName } from '@/shared/lib'
import { type ChoiceSet } from '@/shared/types'

export type ChoiceCodeLanguage = 'csharp' | 'javascript'

export const CHOICE_CODE_LANGUAGES: { value: ChoiceCodeLanguage; label: string }[] = [
  { value: 'csharp', label: 'C#' },
  { value: 'javascript', label: 'JavaScript' },
]

const SPECIAL_CHARACTERS = /[&/\\#,+()$~%.'":*?<>{}-]/g

export const sanitizeIdentifier = (content: string, whitespaceReplacement: string): string =>
  content.trim().replace(SPECIAL_CHARACTERS, '').replace(/\s+/g, whitespaceReplacement)

export const generateChoiceCode = (choice: ChoiceSet, language: ChoiceCodeLanguage): string => {
  if (language === 'csharp') {
    const members = choice.options.map((option) => `\t${sanitizeIdentifier(option.label, '_')} = ${option.value},`)
    return [`public enum ${sanitizeIdentifier(choice.name, '')}`, '{', ...members, '}'].join('\n')
  }
  const members = choice.options.map((option) => `\t${sanitizeIdentifier(option.label, '')}: ${option.value},`)
  return [`const ${pluralName(sanitizeIdentifier(choice.name, ''))} = {`, ...members, '};'].join('\n')
}

export const choiceLabel = (choice: ChoiceSet): string => `${choice.name} (${choice.scope})`
