export type TextSegment = { kind: 'text'; value: string } | { kind: 'guid'; value: string }

const GUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

export const splitGuids = (text: string): TextSegment[] => {
  const segments: TextSegment[] = []
  let last = 0
  for (const match of text.matchAll(GUID_PATTERN)) {
    const index = match.index
    if (index > last) {
      segments.push({ kind: 'text', value: text.slice(last, index) })
    }
    segments.push({ kind: 'guid', value: match[0].toLowerCase() })
    last = index + match[0].length
  }
  if (last < text.length) {
    segments.push({ kind: 'text', value: text.slice(last) })
  }
  return segments
}

export const shortId = (guid: string | null): string => (guid ? guid.slice(0, 8) : '')
