import { describe, expect, it } from 'vitest'

import { exportFileName, formatFields, parseFields, parseTemplateFile, serializeTemplate } from './templateFile'

describe('templateFile', () => {
  it('round-trips the legacy export shape', () => {
    const text = serializeTemplate({ name: 'Contact', fields: { firstname: 'A' } })
    expect(JSON.parse(text)).toEqual({ templateName: 'Contact', fields: { firstname: 'A' } })
    expect(parseTemplateFile(text)).toEqual({ name: 'Contact', fields: { firstname: 'A' } })
  })

  it('accepts a bare fields object', () => {
    expect(parseTemplateFile('{"firstname":"A"}')).toEqual({ name: '', fields: { firstname: 'A' } })
  })

  it('rejects non-object content', () => {
    expect(() => parseTemplateFile('[1,2]')).toThrow()
    expect(() => parseFields('"x"')).toThrow()
  })

  it('formats fields with sorted keys', () => {
    expect(formatFields({ b: 1, a: 2 })).toBe('{\n  "a": 2,\n  "b": 1\n}')
    expect(exportFileName('  ')).toBe('Template - Untitled.json')
  })
})
