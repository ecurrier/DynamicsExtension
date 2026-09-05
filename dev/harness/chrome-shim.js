;(() => {
  const listeners = []
  const grantedOrigins = new Set(
    new URLSearchParams(location.search).get('granted') === '1' ? ['https://org12345.crm.dynamics.com/*'] : [],
  )
  const permissionListeners = { added: [] }
  const makeArea = (initial, areaName = 'local') => {
    const store = { ...initial }
    return {
      get: async (keys) => {
        if (keys === null || keys === undefined) return { ...store }
        const list = Array.isArray(keys) ? keys : typeof keys === 'string' ? [keys] : Object.keys(keys)
        const out = {}
        for (const k of list) if (k in store) out[k] = store[k]
        return out
      },
      set: async (items) => {
        const changes = {}
        for (const [k, v] of Object.entries(items)) {
          changes[k] = { oldValue: store[k], newValue: v }
          store[k] = v
        }
        listeners.forEach((l) => l(changes, areaName))
      },
      remove: async (keys) => {
        const list = Array.isArray(keys) ? keys : [keys]
        const changes = {}
        for (const k of list) {
          changes[k] = { oldValue: store[k], newValue: undefined }
          delete store[k]
        }
        listeners.forEach((l) => l(changes, areaName))
      },
      clear: async () => {
        for (const k of Object.keys(store)) delete store[k]
      },
      getBytesInUse: async () => 0,
      onChanged: { addListener: (l) => listeners.push(l), removeListener: () => {} },
    }
  }

  const legacy = {
    'Settings.environments.11111111-1111-4111-8111-111111111111': {
      environmentName: 'Contoso Dev',
      environmentType: 'Commercial',
      modelDrivenAppUrl: 'https://contoso-dev.crm.dynamics.com/',
      powerPagesUrl: 'https://contoso-dev.powerappsportals.com/',
      environmentId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    },
    'Settings.environments.22222222-2222-4222-8222-222222222222': {
      environmentName: 'Contoso UAT',
      environmentType: 'GCC',
      modelDrivenAppUrl: 'https://contoso-uat.crm9.dynamics.com/',
      powerPagesUrl: '',
      environmentId: 'ffffffff-1111-4222-8333-444444444444',
    },
    'Settings.extension': {
      Extension: { OpenLastVisitedPage: { Enabled: false } },
      Utilities: {
        OpenMakerUrl: { DefaultEnvironment: false },
        OpenControlEditor: { UseDefaultSolution: true },
        OpenAdminCenter: { DefaultEnvironment: false },
      },
      Security: { ApplyChanges: { RequireConfirmation: true } },
    },
    'Templates.model-driven-app.33333333-3333-4333-8333-333333333333': {
      templateName: 'Contact defaults',
      fields: { firstname: 'Test', lastname: 'User', donotemail: true },
    },
  }

  const entityInfos = {
    systemuser: {
      logicalName: 'systemuser',
      displayName: 'User',
      entitySetName: 'systemusers',
      primaryIdAttribute: 'systemuserid',
      primaryNameAttribute: 'fullname',
    },
    team: {
      logicalName: 'team',
      displayName: 'Team',
      entitySetName: 'teams',
      primaryIdAttribute: 'teamid',
      primaryNameAttribute: 'name',
    },
    contact: {
      logicalName: 'contact',
      displayName: 'Contact',
      entitySetName: 'contacts',
      primaryIdAttribute: 'contactid',
      primaryNameAttribute: 'fullname',
    },
    account: {
      logicalName: 'account',
      displayName: 'Account',
      entitySetName: 'accounts',
      primaryIdAttribute: 'accountid',
      primaryNameAttribute: 'name',
    },
  }
  const sampleRecords = {
    systemuser: ['Jane Doe', 'John Smith', 'Priya Patel', 'Marcus Chen', 'Ana Souza'],
    team: ['Sales Team', 'Service Team', 'Marketing'],
    contact: ['Alex Johnson', 'Sam Lee', "Taylor O'Brien", 'Jordan Kim', 'Casey Morgan', 'Riley Diaz'],
    account: ['Contoso Ltd', 'Fabrikam Inc', 'Northwind Traders', 'Adventure Works'],
  }
  const searchRecords = (entity, query, top) =>
    (sampleRecords[entity] ?? [])
      .map((name, index) => ({
        id: `${entity}-${index + 1}`,
        name,
        modifiedOn: new Date(Date.now() - index * 3600000).toISOString(),
      }))
      .filter((row) => !query || row.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, top)

  const roles = [
    { id: 'r1', name: 'Basic User', businessUnitId: 'bu1' },
    { id: 'r2', name: 'Sales Manager', businessUnitId: 'bu1' },
    { id: 'r3', name: 'System Administrator', businessUnitId: 'bu1' },
    { id: 'r4', name: 'System Customizer', businessUnitId: 'bu1' },
    { id: 'r5', name: 'Basic User', businessUnitId: 'bu2' },
  ]

  const guid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const remoteUnits = [
    { businessunitid: guid(101), name: 'Remote Root' },
    { businessunitid: guid(102), name: 'Remote Sales' },
  ]
  const remoteRoles = [
    { roleid: guid(201), name: 'Basic User', _businessunitid_value: guid(101) },
    { roleid: guid(202), name: 'Remote Manager', _businessunitid_value: guid(101) },
    { roleid: guid(203), name: 'System Administrator', _businessunitid_value: guid(101) },
    { roleid: guid(204), name: 'Basic User', _businessunitid_value: guid(102) },
  ]
  const remoteUsers = [
    { systemuserid: guid(301), fullname: 'Remote Jane' },
    { systemuserid: guid(302), fullname: 'Remote John' },
  ]
  const jsonResponse = (body, status = 200) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  const realFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url
    if (url.includes('login.microsoftonline.')) {
      console.log('[harness] token request', url)
      return jsonResponse({ access_token: 'harness-token', expires_in: 3600 })
    }
    const marker = '/api/data/v9.2/'
    const index = url.indexOf(marker)
    if (index < 0) return realFetch(input, init)
    const path = decodeURIComponent(url.slice(index + marker.length))
    const method = init?.method ?? 'GET'
    console.log('[harness] dataverse', method, path.slice(0, 80))
    await new Promise((r) => setTimeout(r, 150))
    if (path.startsWith('WhoAmI'))
      return jsonResponse({ UserId: guid(999), BusinessUnitId: guid(101), OrganizationId: guid(1) })
    if (path.startsWith('roles?') && path.includes('link-entity'))
      return jsonResponse({ value: remoteRoles.filter((r) => [guid(201), guid(203)].includes(r.roleid)) })
    if (path.startsWith('roles?')) return jsonResponse({ value: remoteRoles })
    if (path.startsWith('businessunits?')) return jsonResponse({ value: remoteUnits })
    if (path.startsWith('systemusers?') && path.includes('businessunitid'))
      return jsonResponse({ value: [{ systemuserid: guid(301) }] })
    if (path.startsWith('systemusers?')) return jsonResponse({ value: remoteUsers })
    if (method === 'POST' || method === 'DELETE' || method === 'PATCH') return new Response(null, { status: 204 })
    return jsonResponse({ error: { message: `harness: no fake response for ${method} ${path}` } }, 404)
  }

  const responses = {
    'global.getPageContext': () => 'model-driven-app',
    'global.getSolutions': () => [
      { id: 'fd140aaf-4df4-11dd-bd17-0019b9312238', name: 'Default Solution' },
      { id: 's2', name: 'Contoso Core' },
    ],
    'settings.getEnvironmentDetails': () => ({
      environmentName: 'org12345',
      environmentId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      environmentType: 'Commercial',
      modelDrivenAppUrl: 'https://org12345.crm.dynamics.com/',
      powerPagesUrl: 'https://org12345.powerappsportals.com/',
      geographicalRegion: 'NA',
      organizationId: '99999999-9999-4999-8999-999999999999',
      tenantId: '77777777-7777-4777-8777-777777777777',
      blockedAttachments: 'exe;bat;com',
      baseCurrency: 'US Dollar',
    }),
    'utilities.refreshCommandBar': () => undefined,
    'utilities.generateFetchXml': () => [
      {
        name: 'Current Record (account)',
        fetchXml:
          '<fetch><entity name="account"><attribute name="accountid" /><filter type="and"><condition attribute="accountid" operator="eq" value="abc" /></filter></entity></fetch>',
      },
      {
        name: 'Contacts (contact_customer_accounts)',
        fetchXml:
          "<fetch version='1.0'><entity name='contact'><attribute name='fullname' /><order attribute='fullname' /></entity></fetch>",
      },
    ],
    'utilities.generateUrls': () => ({
      appUrl: 'https://org12345.crm.dynamics.com/main.aspx?appid=1',
      urls: [
        {
          name: 'Current Record/View',
          url: 'https://org12345.crm.dynamics.com/main.aspx?appid=1&pagetype=entityrecord&etn=account&id=abc',
        },
        {
          name: 'Primary Contact (contact)',
          url: 'https://org12345.crm.dynamics.com/main.aspx?appid=1&pagetype=entityrecord&etn=contact&id=def',
        },
      ],
    }),
    'utilities.getWebApiUrl': () => 'https://org12345.crm.dynamics.com/api/data/v9.2/',
    'utilities.toggleControlLogicalNames': () => ({ mode: 'logical' }),
    'utilities.enableAdminMode': () => undefined,
    'utilities.getChoiceMetadata': () => ({
      entityName: 'account',
      choices: [
        {
          name: 'Account Type',
          scope: 'account',
          options: [
            { value: 1, label: 'Customer' },
            { value: 2, label: 'Partner (Gold)' },
          ],
        },
        {
          name: 'Do not email',
          scope: 'account',
          options: [
            { value: 0, label: 'Allow' },
            { value: 1, label: 'Do Not Allow' },
          ],
        },
        {
          name: 'Global Status',
          scope: 'global',
          options: [
            { value: 100000000, label: 'Open' },
            { value: 100000001, label: 'Closed' },
          ],
        },
      ],
    }),
    'utilities.getControlDetails': () => ({ entityName: 'account', controlType: 'form/edit', id: 'form-1' }),
    'templates.captureFormValues': () => ({
      name: 'Contoso',
      telephone1: '555-0100',
      revenue: 1000,
      primarycontactid: [{ id: 'x', entityType: 'contact', name: 'Jane' }],
    }),
    'templates.applyFormValues': (args) => ({
      applied: Object.keys(args.fields).length - 1,
      skipped: [Object.keys(args.fields)[0]],
    }),
    'webapi.getAttributeMetadata': () => ({
      entityName: 'account',
      entityId: 'abc',
      attributes: [
        {
          logicalName: 'accountcategorycode',
          displayName: 'Category',
          attributeType: 'Picklist',
          targets: [],
          options: [
            { value: 1, label: 'Preferred Customer' },
            { value: 2, label: 'Standard' },
          ],
          dateTimeFormat: null,
        },
        {
          logicalName: 'creditlimit',
          displayName: 'Credit Limit',
          attributeType: 'Money',
          targets: [],
          options: [],
          dateTimeFormat: null,
        },
        {
          logicalName: 'description',
          displayName: 'Description',
          attributeType: 'Memo',
          targets: [],
          options: [],
          dateTimeFormat: null,
        },
        {
          logicalName: 'donotemail',
          displayName: 'Do not allow Emails',
          attributeType: 'Boolean',
          targets: [],
          options: [
            { value: 0, label: 'Allow' },
            { value: 1, label: 'Do Not Allow' },
          ],
          dateTimeFormat: null,
        },
        {
          logicalName: 'lastonholdtime',
          displayName: 'Last On Hold Time',
          attributeType: 'DateTime',
          targets: [],
          options: [],
          dateTimeFormat: 'DateAndTime',
        },
        {
          logicalName: 'name',
          displayName: 'Account Name',
          attributeType: 'String',
          targets: [],
          options: [],
          dateTimeFormat: null,
        },
        {
          logicalName: 'ownerid',
          displayName: 'Owner',
          attributeType: 'Owner',
          targets: [
            { logicalName: 'systemuser', navigationProperty: 'ownerid' },
            { logicalName: 'team', navigationProperty: 'ownerid' },
          ],
          options: [],
          dateTimeFormat: null,
        },
        {
          logicalName: 'parentaccountid',
          displayName: 'Parent Account',
          attributeType: 'Lookup',
          targets: [{ logicalName: 'account', navigationProperty: 'parentaccountid' }],
          options: [],
          dateTimeFormat: null,
        },
        {
          logicalName: 'primarycontactid',
          displayName: 'Primary Contact',
          attributeType: 'Lookup',
          targets: [{ logicalName: 'contact', navigationProperty: 'primarycontactid' }],
          options: [],
          dateTimeFormat: null,
        },
      ],
    }),
    'webapi.getRecordValues': () => ({
      name: 'Contoso Ltd',
      creditlimit: 5000,
      'creditlimit@OData.Community.Display.V1.FormattedValue': '$5,000.00',
      accountcategorycode: 1,
      'accountcategorycode@OData.Community.Display.V1.FormattedValue': 'Preferred Customer',
      _ownerid_value: 'u1',
      '_ownerid_value@OData.Community.Display.V1.FormattedValue': 'Jane Doe',
      '_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'systemuser',
    }),
    'webapi.updateField': () => undefined,
    'webapi.clearLookup': () => undefined,
    'forms.getForms': () => [
      {
        id: 'form-1',
        name: 'Account',
        type: 2,
        typeLabel: 'Main',
        isManaged: false,
        isCustomizable: true,
        isActive: true,
      },
      {
        id: 'form-2',
        name: 'Account for Interactive experience',
        type: 12,
        typeLabel: 'Main Interactive',
        isManaged: true,
        isCustomizable: true,
        isActive: true,
      },
      {
        id: 'form-3',
        name: 'Account Quick Create',
        type: 7,
        typeLabel: 'Quick Create',
        isManaged: true,
        isCustomizable: false,
        isActive: false,
      },
    ],
    'forms.getFormXml': (args) =>
      `<form><tabs><tab name="SUMMARY_TAB" id="{form-${args.formId}}" IsUserDefined="0" expanded="true"><labels><label description="Summary" languagecode="1033" /></labels><columns><column width="100%"><sections><section name="ACCOUNT_INFORMATION" showlabel="true" columns="11"><labels><label description="ACCOUNT INFORMATION" languagecode="1033" /></labels><rows><row><cell id="{c1}"><labels><label description="Account Name" languagecode="1033" /></labels><control id="name" classid="{4273EDBD-AC1D-40d3-9FB2-095C621B552D}" datafieldname="name" disabled="false" /></cell></row><row><cell id="{c2}"><labels><label description="Phone" languagecode="1033" /></labels><control id="telephone1" classid="{4273EDBD-AC1D-40d3-9FB2-095C621B552D}" datafieldname="telephone1" disabled="false" /></cell></row></rows></section></sections></column></columns></tab></tabs><header id="{h1}" celllabelposition="Top" columns="111" labelwidth="115" /></form>`,
    'forms.updateFormXml': () => undefined,
    'traces.query': (query) =>
      traceSamples
        .filter(
          (log) =>
            (!query.exceptionsOnly || log.exceptionDetails) &&
            (!query.correlationId || log.correlationId === query.correlationId.toLowerCase()) &&
            (!query.typeName || log.typeName.toLowerCase().includes(query.typeName.toLowerCase())) &&
            (!query.messageName || log.messageName.toLowerCase().includes(query.messageName.toLowerCase())) &&
            (!query.primaryEntity || log.primaryEntity.toLowerCase().includes(query.primaryEntity.toLowerCase())),
        )
        .slice(0, query.top),
    'traces.delete': (args) => ({ deleted: args.ids.length }),
    'traces.getSetting': () => 2,
    'traces.setSetting': () => undefined,
    'webapi.getEntityInfo': (args) =>
      entityInfos[args.logicalName] ?? {
        logicalName: args.logicalName,
        displayName: args.logicalName,
        entitySetName: `${args.logicalName}s`,
        primaryIdAttribute: `${args.logicalName}id`,
        primaryNameAttribute: 'name',
      },
    'webapi.searchRecords': (args) => searchRecords(args.entityLogicalName, args.query, args.top),
    'webapi.executeFetchXml': () =>
      Array.from({ length: 120 }, (_, i) => ({
        '@odata.etag': 'W/"1"',
        accountid: `id-${i}`,
        name: `Account ${i}`,
        revenue: i * 100,
        'revenue@OData.Community.Display.V1.FormattedValue': `$${i * 100}.00`,
        statecode: i % 2,
      })),
    'security.getCurrentUser': () => ({ userId: 'u1', userName: 'Jane Doe', roleIds: ['r1', 'r3'] }),
    'security.getSecurityRoles': () => roles,
    'security.getBusinessUnits': () => [
      { id: 'bu1', name: 'Contoso' },
      { id: 'bu2', name: 'Contoso Europe' },
    ],
    'security.searchSystemUsers': (args) => [
      { id: 'u1', fullName: 'Jane Doe', azureAdObjectId: guid(501), domainName: 'jane@contoso.com', isDisabled: false },
      {
        id: 'u2',
        fullName: `John ${args.query}`,
        azureAdObjectId: null,
        domainName: 'john@contoso.com',
        isDisabled: true,
      },
    ],
    'security.getUserSecurityRoles': (args) =>
      args.systemUserId === 'u1'
        ? roles.filter((r) => ['r1', 'r3'].includes(r.id))
        : roles.filter((r) => r.id === 'r1'),
    'security.getSystemUserRoles': (args) =>
      args.systemUserId === 'u1' ? roles.filter((r) => ['r1', 'r3', 'r5'].includes(r.id)) : [],
    'security.applySecurityRoleChanges': () => undefined,
  }

  const traceTypes = [
    'Contoso.Plugins.AccountPreCreate',
    'Contoso.Plugins.ContactPostUpdate',
    'Contoso.Workflows.SendNotification',
  ]
  const traceMessages = ['Create', 'Update', 'Retrieve', 'Delete']
  const traceEntities = ['account', 'contact', 'opportunity']
  const traceSamples = Array.from({ length: 60 }, (_, i) => {
    const correlation = guid(1000 + Math.floor(i / 3))
    const target = guid(5000 + i)
    const failed = i % 7 === 0
    const started = new Date(Date.now() - i * 90000)
    return {
      id: guid(2000 + i),
      createdOn: started.toISOString(),
      typeName: traceTypes[i % 3],
      messageName: traceMessages[i % 4],
      primaryEntity: traceEntities[i % 3],
      operationType: i % 3 === 2 ? 2 : 1,
      mode: i % 5 === 0 ? 1 : 0,
      depth: (i % 3) + 1,
      correlationId: correlation,
      requestId: guid(3000 + i),
      pluginStepId: guid(4000 + (i % 6)),
      executionStart: started.toISOString(),
      executionDurationMs: 40 + ((i * 37) % 900),
      constructorDurationMs: 2 + (i % 9),
      exceptionDetails: failed
        ? `Unhandled exception: System.InvalidOperationException: Record ${target} is locked by ${guid(501)}\n   at ${traceTypes[i % 3]}.Execute(IServiceProvider serviceProvider)`
        : null,
      messageBlock: `Entering ${traceTypes[i % 3]}\nTarget: ${traceEntities[i % 3]} ${target}\nCorrelation ${correlation}\nInitiating user ${guid(501)}\nDone in ${40 + ((i * 37) % 900)} ms`,
      configuration: i % 2 ? 'mode=verbose' : null,
      secureConfiguration: null,
    }
  })

  const local = makeArea(legacy, 'local')
  const session = makeArea(
    {
      traceViewerLaunch: {
        tabId: 1,
        orgOrigin: 'https://org12345.crm.dynamics.com',
        environmentName: 'org12345',
        launchedAt: new Date().toISOString(),
      },
    },
    'session',
  )
  const backgroundHandlers = {
    'impersonation.start': async ({ tabId, orgOrigin, user }) => {
      const header = user.azureAdObjectId ? 'CallerObjectId' : 'MSCRMCallerID'
      const state = { tabId, orgOrigin, user, header, startedAt: new Date().toISOString() }
      const current = (await session.get('impersonation')).impersonation ?? {}
      await session.set({ impersonation: { ...current, [tabId]: state } })
      return state
    },
    'impersonation.stop': async ({ tabId }) => {
      const current = { ...((await session.get('impersonation')).impersonation ?? {}) }
      delete current[tabId]
      await session.set({ impersonation: current })
    },
    'impersonation.getState': async ({ tabId }) => (await session.get('impersonation')).impersonation?.[tabId] ?? null,
    'auth.ensureTokenOriginRule': async () => undefined,
  }
  window.chrome = {
    runtime: {
      id: 'harness',
      getURL: (path) => new URL(path, location.href).toString(),
      lastError: undefined,
      onMessage: { addListener() {}, removeListener() {} },
      sendMessage: async (message) => {
        console.log('[harness] runtime.sendMessage', message)
        const handler = backgroundHandlers[message?.name]
        if (!handler)
          return {
            ok: false,
            error: { name: 'UnknownCommand', message: `harness: no background handler for ${message?.name}` },
          }
        try {
          return { ok: true, value: await handler(message.args) }
        } catch (error) {
          return { ok: false, error: { name: 'Error', message: String(error) } }
        }
      },
    },
    storage: { local, session, sync: makeArea({}), onChanged: local.onChanged },
    tabs: {
      query: async () => [
        { id: 1, url: 'https://org12345.crm.dynamics.com/main.aspx?appid=1&pagetype=entityrecord&etn=account&id=abc' },
      ],
      create: async ({ url }) => {
        const harnessUrl = url
          .replace('results-viewer.html', 'harness-results.html')
          .replace('plugin-traces.html', 'harness-traces.html')
        console.log('[harness] tabs.create', url, '->', harnessUrl)
        window.open(harnessUrl, '_blank')
        return { id: 2 }
      },
      reload: async (tabId) => console.log('[harness] tabs.reload', tabId),
      get: async (tabId) => ({
        id: tabId,
        url: 'https://org12345.crm.dynamics.com/main.aspx?appid=1&pagetype=entityrecord&etn=account&id=abc',
      }),
      onRemoved: { addListener() {}, removeListener() {} },
      onUpdated: { addListener() {}, removeListener() {} },
    },
    windows: {
      create: async ({ url, width, height }) => {
        const harnessUrl = url.replace('popup.html', 'harness')
        console.log('[harness] windows.create', url, '->', harnessUrl)
        window.open(harnessUrl, '_blank', `popup,width=${width},height=${height}`)
        return { id: 7 }
      },
      update: async (windowId) => {
        throw new Error(`harness: window ${windowId} is not open`)
      },
    },
    permissions: {
      contains: async ({ origins = [] }) => origins.every((origin) => grantedOrigins.has(origin)),
      request: async ({ origins = [] }) => {
        console.log('[harness] permissions.request', origins)
        origins.forEach((origin) => grantedOrigins.add(origin))
        permissionListeners.added.forEach((listener) => listener({ origins }))
        return true
      },
      onAdded: {
        addListener: (listener) => permissionListeners.added.push(listener),
        removeListener: (listener) => {
          permissionListeners.added = permissionListeners.added.filter((l) => l !== listener)
        },
      },
      onRemoved: { addListener() {}, removeListener() {} },
    },
    scripting: {
      executeScript: async (injection) => {
        if (injection.files) return [{ frameId: 0 }]
        const [name, args] = injection.args
        const handler = responses[name]
        await new Promise((r) => setTimeout(r, 150))
        if (!handler)
          return [
            {
              frameId: 0,
              result: { ok: false, error: { name: 'UnknownCommand', message: `harness: no handler for ${name}` } },
            },
          ]
        try {
          return [{ frameId: 0, result: { ok: true, value: handler(args) } }]
        } catch (error) {
          return [{ frameId: 0, result: { ok: false, error: { name: 'Error', message: String(error) } } }]
        }
      },
    },
  }
})()
