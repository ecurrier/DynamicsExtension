// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

import { parseFormEvents } from './formEvents'

const formXml = `
<form>
  <formLibraries>
    <Library name="new_account.js" libraryUniqueId="{1}" />
    <Library name="new_shared.js" libraryUniqueId="{2}" />
  </formLibraries>
  <events>
    <event name="onload" application="false" active="false">
      <Handlers>
        <Handler functionName="Contoso.Account.onLoad" libraryName="new_account.js" enabled="true" parameters="" passExecutionContext="true" />
        <Handler functionName="Contoso.Shared.audit" libraryName="new_shared.js" enabled="false" parameters="42" passExecutionContext="false" />
      </Handlers>
    </event>
    <event name="onchange" attribute="statuscode" application="false" active="false">
      <Handlers>
        <Handler functionName="Contoso.Account.onStatusChange" libraryName="new_account.js" enabled="true" passExecutionContext="true" />
      </Handlers>
    </event>
    <event name="onsave">
      <Handlers />
    </event>
  </events>
</form>`

describe('parseFormEvents', () => {
  it('reads the libraries in declaration order', () => {
    expect(parseFormEvents(formXml).libraries).toEqual([
      { name: 'new_account.js', order: 1 },
      { name: 'new_shared.js', order: 2 },
    ])
  })

  it('reads handlers with their execution order within the event', () => {
    const { handlers } = parseFormEvents(formXml)
    expect(handlers).toHaveLength(3)
    expect(handlers[0]).toEqual({
      event: 'onload',
      target: null,
      library: 'new_account.js',
      functionName: 'Contoso.Account.onLoad',
      enabled: true,
      passExecutionContext: true,
      parameters: null,
      order: 1,
    })
    expect(handlers[1]?.order).toBe(2)
    expect(handlers[1]?.enabled).toBe(false)
    expect(handlers[1]?.parameters).toBe('42')
  })

  it('captures the column an onchange handler is bound to', () => {
    const onChange = parseFormEvents(formXml).handlers.find((handler) => handler.event === 'onchange')
    expect(onChange?.target).toBe('statuscode')
    expect(onChange?.order).toBe(1)
  })

  it('returns nothing for malformed XML instead of throwing', () => {
    expect(parseFormEvents('<form><events>')).toEqual({ libraries: [], handlers: [] })
  })
})
