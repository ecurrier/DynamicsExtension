const INVALID_CHARACTERS = /[^A-Za-z0-9_]/g
const SPECIAL_CHARACTERS = /[&/\x5c#,+()$~%.'":*?<>{}-]/g

export const sanitizeIdentifier = (content: string, whitespaceReplacement: string): string =>
  content.trim().replace(SPECIAL_CHARACTERS, '').replace(/\s+/g, whitespaceReplacement)

export const parsePrefixes = (prefixes: string): string[] =>
  prefixes
    .split(/[,\s]+/)
    .map((prefix) => prefix.replace(/_+$/, '').toLowerCase())
    .filter((prefix) => prefix.length > 0)

export const stripPrefix = (schemaName: string, prefixes: string): string => {
  const lower = schemaName.toLowerCase()
  for (const prefix of parsePrefixes(prefixes)) {
    const head = `${prefix}_`
    if (lower.startsWith(head)) {
      return schemaName.slice(head.length)
    }
  }
  return schemaName
}

export const pascalCase = (value: string): string => {
  const joined = value
    .replace(INVALID_CHARACTERS, '_')
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return /^[0-9]/.test(joined) ? `_${joined}` : joined
}

export const camelCase = (value: string): string => {
  const pascal = pascalCase(value)
  const leading = /^[A-Z]+/.exec(pascal)?.[0] ?? ''
  if (leading.length <= 1) {
    return pascal.charAt(0).toLowerCase() + pascal.slice(1)
  }
  const nextIsLower = pascal.length > leading.length && /[a-z]/.test(pascal.charAt(leading.length))
  const lowered = nextIsLower ? leading.length - 1 : leading.length
  return pascal.slice(0, lowered).toLowerCase() + pascal.slice(lowered)
}

export const identifierFor = (schemaName: string, prefix: string): string => pascalCase(stripPrefix(schemaName, prefix))
