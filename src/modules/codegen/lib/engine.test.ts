import { describe, expect, it } from 'vitest'

import { renderTemplate } from './engine'

const render = (text: string, view: unknown): string => renderTemplate(text, view).output

describe('variables', () => {
  it('interpolates simple and dotted paths', () => {
    const view = { name: 'World', table: { identifier: 'Account' } }
    expect(render('Hello {{name}}, {{table.identifier}}', view)).toBe('Hello World, Account')
  })

  it('does not escape output', () => {
    expect(render('{{code}}', { code: 'List<T> & "x"' })).toBe('List<T> & "x"')
  })

  it('renders numbers and booleans literally', () => {
    expect(render('{{count}} {{flag}}', { count: 0, flag: false })).toBe('0 false')
  })

  it('ignores whitespace inside tags', () => {
    expect(render('{{ name }}', { name: 'x' })).toBe('x')
  })

  it('ignores inherited properties', () => {
    expect(renderTemplate('{{constructor}}', {})).toEqual({ output: '', unresolved: ['constructor'], error: null })
  })
})

describe('context stack', () => {
  it('prefers the innermost context and falls back outward', () => {
    const view = { outer: 'o', name: 'top', items: [{ name: 'a' }, { name: 'b', outer: 'inner' }] }
    expect(render('{{#items}}{{name}}/{{outer}} {{/items}}', view)).toBe('a/o b/inner ')
  })

  it('resolves dotted paths from the first context that owns the head', () => {
    const view = { table: { name: 'outer' }, items: [{ table: { name: 'inner' } }, {}] }
    expect(render('{{#items}}{{table.name}} {{/items}}', view)).toBe('inner outer ')
  })

  it('renders the current scalar with {{.}}', () => {
    expect(render('{{#names}}{{.}};{{/names}}', { names: ['a', 'b', 1] })).toBe('a;b;1;')
  })
})

describe('sections', () => {
  it('iterates arrays using flags from the data', () => {
    const columns = [
      { name: 'a', isFirst: true },
      { name: 'b', isFirst: false },
      { name: 'c', isFirst: false },
    ]
    expect(render('{{#columns}}{{^isFirst}}, {{/isFirst}}{{name}}{{/columns}}', { columns })).toBe('a, b, c')
  })

  it('renders a truthy object once with it pushed as context', () => {
    expect(render('{{#table}}{{logicalName}}{{/table}}', { table: { logicalName: 'account' } })).toBe('account')
  })

  it('renders a truthy scalar once without hiding outer values', () => {
    expect(render('{{#isCustom}}custom {{name}} {{.}}{{/isCustom}}', { isCustom: true, name: 'x' })).toBe(
      'custom x true',
    )
  })

  it('renders nothing for falsy values and empty arrays', () => {
    const template = '{{#a}}x{{/a}}{{#b}}x{{/b}}{{#c}}x{{/c}}{{#d}}x{{/d}}{{#e}}x{{/e}}{{#f}}x{{/f}}'
    expect(render(template, { a: false, b: [], c: null, d: 0, e: '' })).toBe('')
  })

  it('renders inverted sections for falsy values and empty arrays', () => {
    const template = '{{^flag}}no{{/flag}}{{^list}}empty{{/list}}{{^missing}}gone{{/missing}}'
    expect(render(template, { flag: false, list: [] })).toBe('noemptygone')
  })

  it('skips inverted sections for truthy values and non-empty arrays', () => {
    expect(render('{{^flag}}no{{/flag}}{{^list}}empty{{/list}}', { flag: true, list: [1] })).toBe('')
  })

  it('nests sections', () => {
    const view = { tables: [{ name: 't', columns: [{ name: 'a' }, { name: 'b' }] }] }
    expect(render('{{#tables}}{{name}}:{{#columns}}{{name}}{{/columns}}{{/tables}}', view)).toBe('t:ab')
  })
})

describe('comments', () => {
  it('drops comments from the output', () => {
    expect(render('a{{! ignored }}b{{!}}c', {})).toBe('abc')
  })
})

describe('standalone lines', () => {
  it('removes lines that only hold section tags', () => {
    const template = 'class X {\n{{#columns}}\n  {{name}};\n{{/columns}}\n}'
    expect(render(template, { columns: [{ name: 'a' }, { name: 'b' }] })).toBe('class X {\n  a;\n  b;\n}')
  })

  it('removes indented standalone tags along with their surrounding spaces', () => {
    const template = '{\n  {{#items}}  \n    {{.}}\n  {{/items}}\n}'
    expect(render(template, { items: [1, 2] })).toBe('{\n    1\n    2\n}')
  })

  it('keeps windows line endings intact', () => {
    const template = 'a\r\n{{#items}}\r\n{{.}}\r\n{{/items}}\r\nb'
    expect(render(template, { items: [1, 2] })).toBe('a\r\n1\r\n2\r\nb')
  })

  it('removes standalone comment lines', () => {
    expect(render('a\n{{! note }}\nb', {})).toBe('a\nb')
  })

  it('treats the template edges as line boundaries', () => {
    expect(render('{{#items}}\n{{.}}\n{{/items}}', { items: [1, 2] })).toBe('1\n2\n')
  })

  it('removes adjacent standalone lines', () => {
    expect(render('{{#a}}\n{{/a}}\n{{^a}}\nx\n{{/a}}\n', { a: false })).toBe('x\n')
  })

  it('keeps tags that share a line with other content', () => {
    expect(render('x {{#flag}}\ny\n{{/flag}} z', { flag: true })).toBe('x \ny\n z')
  })

  it('never treats interpolations as standalone', () => {
    expect(render('a\n{{name}}\nb', { name: '' })).toBe('a\n\nb')
  })
})

describe('unresolved paths', () => {
  it('renders missing and null values as empty strings and reports each path once', () => {
    const result = renderTemplate('{{a}}-{{b.c}}-{{a}}-{{d}}', { b: {}, d: null })
    expect(result.output).toBe('---')
    expect(result.unresolved).toEqual(['a', 'b.c', 'd'])
    expect(result.error).toBeNull()
  })

  it('reports sections over unknown paths but not over null values', () => {
    const template = '{{#missing}}x{{/missing}}{{#maxLength}}y{{/maxLength}}{{^known}}z{{/known}}'
    const result = renderTemplate(template, { maxLength: null, known: false })
    expect(result.output).toBe('z')
    expect(result.unresolved).toEqual(['missing'])
  })

  it('resolves nothing against a non-object view without throwing', () => {
    expect(renderTemplate('{{length}}', 'abc')).toEqual({ output: '', unresolved: ['length'], error: null })
    expect(renderTemplate('{{a}}', undefined)).toEqual({ output: '', unresolved: ['a'], error: null })
  })

  it('does not report paths whose values resolve', () => {
    expect(renderTemplate('{{a}}{{#b}}{{.}}{{/b}}', { a: 'x', b: [1] }).unresolved).toEqual([])
  })
})

describe('errors', () => {
  it('reports an unclosed section', () => {
    const result = renderTemplate('{{#columns}}{{name}}', {})
    expect(result.error).toContain('columns')
    expect(result.output).toBe('')
    expect(result.unresolved).toEqual([])
  })

  it('reports an unclosed inverted section', () => {
    expect(renderTemplate('{{^flag}}x', {}).error).toContain('^flag')
  })

  it('reports a close without an open', () => {
    expect(renderTemplate('x{{/columns}}', {}).error).toContain('columns')
  })

  it('reports a mismatched close', () => {
    const result = renderTemplate('{{#columns}}{{/rows}}', {})
    expect(result.error).toContain('columns')
    expect(result.error).toContain('rows')
  })

  it('reports an unterminated tag', () => {
    const result = renderTemplate('class {{table.identifier\n{', {})
    expect(result.error).toContain('table.identifier')
    expect(result.output).toBe('')
  })

  it('reports an empty tag', () => {
    expect(renderTemplate('{{}}', {}).error).not.toBeNull()
  })

  it('never throws on malformed input', () => {
    for (const text of ['{{#a}}', '{{/a}}', '{{', '{{#a}}{{/b}}', '{{}}', '}}', '{{#}}', '{{{a}}}']) {
      expect(() => renderTemplate(text, {})).not.toThrow()
    }
  })
})
