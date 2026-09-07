const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

export const escapeXml = (value: string): string => value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char)

export const escapeFetchXmlLike = (value: string): string => escapeXml(value.replace(/[%_[\]]/g, ''))
