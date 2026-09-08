import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'
import { StreamLanguage } from '@codemirror/language'
import { csharp } from '@codemirror/legacy-modes/mode/clike'
import { type Extension } from '@codemirror/state'

export type CodeLanguage = 'json' | 'xml' | 'javascript' | 'typescript' | 'csharp'

export const languageExtension = (language: CodeLanguage): Extension => {
  switch (language) {
    case 'json':
      return json()
    case 'xml':
      return xml()
    case 'javascript':
      return javascript()
    case 'typescript':
      return javascript({ typescript: true })
    case 'csharp':
      return StreamLanguage.define(csharp)
  }
}

export const CODE_LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  json: 'JSON',
  xml: 'XML',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  csharp: 'C#',
}
