import { EditorView } from '@codemirror/view'
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components'
import CodeMirror from '@uiw/react-codemirror'
import { useMemo } from 'react'

import { useSystemTheme } from '@/shared/theme'

import { type CodeLanguage, languageExtension } from './languages'

const useStyles = makeStyles({
  root: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    fontSize: '12px',
  },
  fill: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    '& > div': {
      flex: 1,
      minHeight: 0,
    },
  },
})

export interface CodeEditorProps {
  value: string
  language: CodeLanguage
  onChange?: (value: string) => void
  readOnly?: boolean
  height?: string
  maxHeight?: string
  placeholder?: string
  lineWrapping?: boolean
  fill?: boolean
}

export const CodeEditor = ({
  value,
  language,
  onChange,
  readOnly = false,
  height = '240px',
  maxHeight,
  placeholder,
  lineWrapping = true,
  fill = false,
}: CodeEditorProps) => {
  const styles = useStyles()
  const mode = useSystemTheme()
  const extensions = useMemo(
    () => [languageExtension(language), ...(lineWrapping ? [EditorView.lineWrapping] : [])],
    [language, lineWrapping],
  )
  return (
    <div className={mergeClasses(styles.root, fill && styles.fill)}>
      <CodeMirror
        value={value}
        height={fill ? '100%' : height}
        maxHeight={maxHeight}
        theme={mode}
        extensions={extensions}
        readOnly={readOnly}
        editable={!readOnly}
        placeholder={placeholder}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          foldGutter: !readOnly,
          highlightActiveLine: !readOnly,
          highlightActiveLineGutter: !readOnly,
          autocompletion: !readOnly,
        }}
      />
    </div>
  )
}
