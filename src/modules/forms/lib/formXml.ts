import { type SystemForm } from '@/shared/types'

const parserErrorText = (message: string | null | undefined): string =>
  message?.trim().split('\n')[0]?.trim() || 'The form XML is not well-formed'

export const validateFormXml = (xml: string): string | null => {
  if (!xml.trim()) {
    return 'The form XML is empty'
  }
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  const parserError = document.querySelector('parsererror')
  if (parserError) {
    return parserErrorText(parserError.textContent)
  }
  if (document.documentElement.nodeName !== 'form') {
    return 'The root element must be <form>'
  }
  return null
}

export const formLabel = (form: SystemForm): string =>
  `${form.name} (${form.typeLabel}${form.isActive ? '' : ', inactive'})`

export const formSummary = (form: SystemForm, lineCount: number): string =>
  [
    `${form.typeLabel} form`,
    form.isActive ? 'Active' : 'Inactive',
    form.isManaged ? 'Managed' : 'Unmanaged',
    `${lineCount} line${lineCount === 1 ? '' : 's'}`,
  ].join(' · ')

export const countLines = (text: string): number => (text ? text.split('\n').length : 0)
