export interface TemplateFile {
  name: string
  fields: Record<string, unknown>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const serializeTemplate = (template: TemplateFile): string =>
  JSON.stringify({ templateName: template.name, fields: template.fields }, null, 2)

export const parseTemplateFile = (text: string): TemplateFile => {
  const parsed: unknown = JSON.parse(text)
  if (!isRecord(parsed)) {
    throw new Error('The file does not contain a template object')
  }
  const name =
    typeof parsed.templateName === 'string' ? parsed.templateName : typeof parsed.name === 'string' ? parsed.name : ''
  const fields = isRecord(parsed.fields) ? parsed.fields : isRecord(parsed) && !('fields' in parsed) ? parsed : {}
  return { name, fields }
}

export const parseFields = (text: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(text)
  if (!isRecord(parsed)) {
    throw new Error('Template fields must be a JSON object')
  }
  return parsed
}

export const formatFields = (fields: Record<string, unknown>): string => JSON.stringify(sortKeys(fields), null, 2)

const sortKeys = (fields: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(fields).sort(([left], [right]) => left.localeCompare(right)))

export const exportFileName = (name: string): string => `Template - ${name.trim() || 'Untitled'}.json`
