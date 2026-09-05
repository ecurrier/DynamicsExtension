export const pluralName = (logicalName: string): string => {
  if (!logicalName) {
    return logicalName
  }
  if (logicalName.endsWith('s')) {
    return `${logicalName}es`
  }
  if (logicalName.endsWith('y')) {
    return `${logicalName.slice(0, -1)}ies`
  }
  return `${logicalName}s`
}
