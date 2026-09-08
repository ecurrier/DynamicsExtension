import { describe, expect, it } from 'vitest'

import { exportFileName, formatFields, parseFields, parseFormPresetFile, serializeFormPreset } from './presetFile'

describe('presetFile', () => {
  it('round-trips the export shape', () => {
    const text = serializeFormPreset({ name: 'Contact', fields: { firstname: 'A' } })
    expect(JSON.parse(text)).toEqual({ presetName: 'Contact', fields: { firstname: 'A' } })
    expect(parseFormPresetFile(text)).toEqual({ name: 'Contact', fields: { firstname: 'A' } })
  })

  it('reads files exported before the rename', () => {
    expect(parseFormPresetFile('{"templateName":"Old","fields":{"a":1}}')).toEqual({ name: 'Old', fields: { a: 1 } })
  })

  it('accepts a bare fields object', () => {
    expect(parseFormPresetFile('{"firstname":"A"}')).toEqual({ name: '', fields: { firstname: 'A' } })
  })

  it('rejects non-object content', () => {
    expect(() => parseFormPresetFile('[1,2]')).toThrow()
    expect(() => parseFields('"x"')).toThrow()
  })

  it('formats fields with sorted keys', () => {
    expect(formatFields({ b: 1, a: 2 })).toBe('{\n  "a": 2,\n  "b": 1\n}')
    expect(exportFileName('  ')).toBe('Form Preset - Untitled.json')
  })
})
