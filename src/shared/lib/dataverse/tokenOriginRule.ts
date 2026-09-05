export const TOKEN_ORIGIN_RULE_ID = 2_100_000_000

export const TOKEN_HOSTS = ['login.microsoftonline.com', 'login.microsoftonline.us'] as const

export interface TokenOriginRule {
  id: number
  priority: number
  action: {
    type: 'modifyHeaders'
    requestHeaders: { header: 'Origin'; operation: 'remove' }[]
  }
  condition: {
    initiatorDomains: string[]
    requestDomains: string[]
    urlFilter: string
    requestMethods: ['post']
    resourceTypes: ['xmlhttprequest']
  }
}

export const buildTokenOriginRule = (extensionId: string): TokenOriginRule => ({
  id: TOKEN_ORIGIN_RULE_ID,
  priority: 1,
  action: {
    type: 'modifyHeaders',
    requestHeaders: [{ header: 'Origin', operation: 'remove' }],
  },
  condition: {
    initiatorDomains: [extensionId],
    requestDomains: [...TOKEN_HOSTS],
    urlFilter: '/oauth2/v2.0/token',
    requestMethods: ['post'],
    resourceTypes: ['xmlhttprequest'],
  },
})
