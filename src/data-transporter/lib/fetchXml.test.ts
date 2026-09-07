import { describe, expect, it } from 'vitest'

import { restrictFetchXmlToId, stripPagingAttributes } from './fetchXml'

describe('fetchXml helpers', () => {
  it('strips paging attributes from the fetch element only', () => {
    expect(
      stripPagingAttributes(
        '<fetch page="2" paging-cookie="abc" count="50" top="10"><entity name="account" /></fetch>',
      ),
    ).toBe('<fetch top="10"><entity name="account" /></fetch>')
  })

  it('replaces entity attributes with the primary id and keeps filters and links', () => {
    const fetchXml = [
      '<fetch page="3">',
      '<entity name="account">',
      '<all-attributes/>',
      '<attribute name="name" />',
      '<attribute name="revenue"></attribute>',
      '<filter type="and"><condition attribute="statecode" operator="eq" value="0" /></filter>',
      '<link-entity name="contact" from="contactid" to="primarycontactid" alias="c">',
      '<attribute name="fullname" />',
      '<filter><condition attribute="lastname" operator="eq" value="Doe" /></filter>',
      '</link-entity>',
      '<order attribute="name" />',
      '</entity>',
      '</fetch>',
    ].join('')
    expect(restrictFetchXmlToId(fetchXml, 'accountid')).toBe(
      [
        '<fetch>',
        '<entity name="account"><attribute name="accountid" />',
        '<filter type="and"><condition attribute="statecode" operator="eq" value="0" /></filter>',
        '<link-entity name="contact" from="contactid" to="primarycontactid" alias="c">',
        '<attribute name="fullname" />',
        '<filter><condition attribute="lastname" operator="eq" value="Doe" /></filter>',
        '</link-entity>',
        '<order attribute="name" />',
        '</entity>',
        '</fetch>',
      ].join(''),
    )
  })

  it('returns the input untouched when there is no entity element', () => {
    expect(restrictFetchXmlToId('<fetch></fetch>', 'accountid')).toBe('<fetch></fetch>')
  })
})
