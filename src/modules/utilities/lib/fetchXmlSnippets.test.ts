// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

import { entityNameOf, fetchXmlToOData, webApiSnippet } from './fetchXmlSnippets'

const expectQuery = (fetchXml: string): string => {
  const result = fetchXmlToOData(fetchXml)
  if (!result.ok) {
    throw new Error(`expected a translation but got: ${result.reason}`)
  }
  return result.query
}

describe('fetchXmlToOData', () => {
  it('translates attributes, filters, order, and top', () => {
    const query = expectQuery(`
      <fetch top="5">
        <entity name="account">
          <attribute name="name" />
          <attribute name="revenue" />
          <filter type="and">
            <condition attribute="statecode" operator="eq" value="0" />
            <condition attribute="name" operator="like" value="%contoso%" />
          </filter>
          <order attribute="name" descending="true" />
        </entity>
      </fetch>`)
    expect(query).toBe(
      "?$select=name,revenue&$filter=statecode eq 0 and contains(name,'contoso')&$orderby=name desc&$top=5",
    )
  })

  it('quotes string values and leaves numbers and guids bare', () => {
    const query = expectQuery(`
      <fetch>
        <entity name="contact">
          <filter type="and">
            <condition attribute="ownerid" operator="eq" value="0f1e2d3c-4b5a-4697-8899-aabbccddeeff" />
            <condition attribute="lastname" operator="eq" value="O'Hara" />
          </filter>
        </entity>
      </fetch>`)
    expect(query).toBe("?$filter=ownerid eq 0f1e2d3c-4b5a-4697-8899-aabbccddeeff and lastname eq 'O''Hara'")
  })

  it('maps null, begins-with, and in operators', () => {
    expect(
      expectQuery(
        `<fetch><entity name="account"><filter type="or">
           <condition attribute="parentaccountid" operator="null" />
           <condition attribute="name" operator="begins-with" value="Con" />
           <condition attribute="statuscode" operator="in"><value>1</value><value>2</value></condition>
         </filter></entity></fetch>`,
      ),
    ).toBe("?$filter=parentaccountid eq null or startswith(name,'Con') or (statuscode eq 1 or statuscode eq 2)")
  })

  it('refuses to guess at joins, aggregates, and nested filters', () => {
    const linked = fetchXmlToOData(
      '<fetch><entity name="account"><link-entity name="contact" from="parentcustomerid" to="accountid" /></entity></fetch>',
    )
    expect(linked).toEqual({ ok: false, reason: expect.stringContaining('link-entity') })

    const aggregate = fetchXmlToOData('<fetch aggregate="true"><entity name="account" /></fetch>')
    expect(aggregate.ok).toBe(false)

    const nested = fetchXmlToOData(
      '<fetch><entity name="account"><filter type="and"><filter type="or"><condition attribute="a" operator="eq" value="1" /></filter></filter></entity></fetch>',
    )
    expect(nested).toEqual({ ok: false, reason: expect.stringContaining('nested') })
  })

  it('reports an operator it cannot translate rather than emitting something wrong', () => {
    const result = fetchXmlToOData(
      '<fetch><entity name="account"><filter><condition attribute="createdon" operator="last-x-days" value="7" /></filter></entity></fetch>',
    )
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('last-x-days') })
  })

  it('handles malformed XML', () => {
    expect(fetchXmlToOData('<fetch>').ok).toBe(false)
  })
})

describe('snippet helpers', () => {
  it('reads the entity name', () => {
    expect(entityNameOf('<fetch><entity name="new_thing" /></fetch>')).toBe('new_thing')
    expect(entityNameOf('<fetch />')).toBeNull()
  })

  it('builds a runnable retrieveMultipleRecords call', () => {
    const snippet = webApiSnippet('<fetch>\n  <entity name="account" />\n</fetch>')
    expect(snippet).toContain("'account'")
    expect(snippet).toContain('Xrm.WebApi.retrieveMultipleRecords')
    expect(snippet).toContain('<fetch> <entity name="account" /> </fetch>')
  })
})
