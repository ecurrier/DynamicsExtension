import { type FormEventHandler, type FormLibrary } from '@/shared/types'

export interface ParsedFormEvents {
  libraries: FormLibrary[]
  handlers: FormEventHandler[]
}

const attribute = (element: Element, name: string): string | null => {
  const value = element.getAttribute(name)
  return value === null || value === '' ? null : value
}

const isTrue = (value: string | null): boolean => value?.toLowerCase() === 'true'

export const parseFormEvents = (formXml: string): ParsedFormEvents => {
  const document = new DOMParser().parseFromString(formXml, 'application/xml')
  if (document.querySelector('parsererror')) {
    return { libraries: [], handlers: [] }
  }

  const libraries = [...document.querySelectorAll('formLibraries > Library')].map<FormLibrary>((element, index) => ({
    name: attribute(element, 'name') ?? '',
    order: index + 1,
  }))

  const handlers: FormEventHandler[] = []
  for (const event of document.querySelectorAll('events > event')) {
    const eventName = attribute(event, 'name') ?? 'unknown'
    const target = attribute(event, 'attribute') ?? attribute(event, 'control')
    const eventHandlers = [...event.querySelectorAll('Handlers > Handler')]
    eventHandlers.forEach((handler, index) => {
      handlers.push({
        event: eventName,
        target,
        library: attribute(handler, 'libraryName') ?? '',
        functionName: attribute(handler, 'functionName') ?? '',
        enabled: isTrue(handler.getAttribute('enabled')),
        passExecutionContext: isTrue(handler.getAttribute('passExecutionContext')),
        parameters: attribute(handler, 'parameters'),
        order: index + 1,
      })
    })
  }

  return { libraries, handlers }
}
