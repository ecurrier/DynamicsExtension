(() => {
	const listeners = [];
	const grantedOrigins = new Set(new URLSearchParams(location.search).get("granted") === "1" ? ["https://org12345.crm.dynamics.com/*"] : []);
	const permissionListeners = { added: [] };
	// Add ?closedTab=<id> to the harness URL to exercise the "tab has been closed" path.
	const closedTabs = new Set(
		(new URLSearchParams(location.search).get("closedTab") ?? "")
			.split(",")
			.map((value) => Number(value))
			.filter((value) => Number.isInteger(value) && value > 0)
	);
	const makeArea = (initial, areaName = "local") => {
		const store = { ...initial };
		return {
			get: async (keys) => {
				if (keys === null || keys === undefined) {
					return { ...store };
				}
				const list = Array.isArray(keys) ? keys : typeof keys === "string" ? [keys] : Object.keys(keys);
				const out = {};
				for (const k of list) {
					if (k in store) {
						out[k] = store[k];
					}
				}
				return out;
			},
			set: async (items) => {
				const changes = {};
				for (const [k, v] of Object.entries(items)) {
					changes[k] = { oldValue: store[k], newValue: v };
					store[k] = v;
				}
				listeners.forEach((l) => l(changes, areaName));
			},
			remove: async (keys) => {
				const list = Array.isArray(keys) ? keys : [keys];
				const changes = {};
				for (const k of list) {
					changes[k] = { oldValue: store[k], newValue: undefined };
					delete store[k];
				}
				listeners.forEach((l) => l(changes, areaName));
			},
			clear: async () => {
				for (const k of Object.keys(store)) {
					delete store[k];
				}
			},
			getBytesInUse: async () => 0,
			onChanged: { addListener: (l) => listeners.push(l), removeListener: () => {} },
		};
	};

	const legacy = {
		"Settings.environments.11111111-1111-4111-8111-111111111111": {
			environmentName: "Contoso Dev",
			environmentType: "Commercial",
			modelDrivenAppUrl: "https://contoso-dev.crm.dynamics.com/",
			powerPagesUrl: "https://contoso-dev.powerappsportals.com/",
			environmentId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
		},
		"Settings.environments.22222222-2222-4222-8222-222222222222": {
			environmentName: "Contoso UAT",
			environmentType: "GCC",
			modelDrivenAppUrl: "https://contoso-uat.crm9.dynamics.com/",
			powerPagesUrl: "",
			environmentId: "ffffffff-1111-4222-8333-444444444444",
		},
		"Settings.extension": {
			Extension: { OpenLastVisitedPage: { Enabled: false } },
			Utilities: {
				OpenMakerUrl: { DefaultEnvironment: false },
				OpenControlEditor: { UseDefaultSolution: true },
				OpenAdminCenter: { DefaultEnvironment: false },
			},
			Security: { ApplyChanges: { RequireConfirmation: true } },
		},
		"Templates.model-driven-app.33333333-3333-4333-8333-333333333333": {
			templateName: "Contact defaults",
			fields: { firstname: "Test", lastname: "User", donotemail: true },
		},
	};

	const entityInfos = {
		systemuser: {
			logicalName: "systemuser",
			displayName: "User",
			entitySetName: "systemusers",
			primaryIdAttribute: "systemuserid",
			primaryNameAttribute: "fullname",
		},
		team: {
			logicalName: "team",
			displayName: "Team",
			entitySetName: "teams",
			primaryIdAttribute: "teamid",
			primaryNameAttribute: "name",
		},
		contact: {
			logicalName: "contact",
			displayName: "Contact",
			entitySetName: "contacts",
			primaryIdAttribute: "contactid",
			primaryNameAttribute: "fullname",
		},
		account: {
			logicalName: "account",
			displayName: "Account",
			entitySetName: "accounts",
			primaryIdAttribute: "accountid",
			primaryNameAttribute: "name",
		},
	};
	const sampleRecords = {
		systemuser: ["Jane Doe", "John Smith", "Priya Patel", "Marcus Chen", "Ana Souza"],
		team: ["Sales Team", "Service Team", "Marketing"],
		contact: ["Alex Johnson", "Sam Lee", "Taylor O'Brien", "Jordan Kim", "Casey Morgan", "Riley Diaz"],
		account: ["Contoso Ltd", "Fabrikam Inc", "Northwind Traders", "Adventure Works"],
	};
	const searchRecords = (entity, query, top) =>
		(sampleRecords[entity] ?? [])
			.map((name, index) => ({
				id: `${entity}-${index + 1}`,
				name,
				modifiedOn: new Date(Date.now() - index * 3600000).toISOString(),
			}))
			.filter((row) => !query || row.name.toLowerCase().includes(query.toLowerCase()))
			.slice(0, top);

	const roles = [
		{ id: "r1", name: "Basic User", businessUnitId: "bu1" },
		{ id: "r2", name: "Sales Manager", businessUnitId: "bu1" },
		{ id: "r3", name: "System Administrator", businessUnitId: "bu1" },
		{ id: "r4", name: "System Customizer", businessUnitId: "bu1" },
		{ id: "r5", name: "Basic User", businessUnitId: "bu2" },
	];

	const guid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
	const remoteUnits = [
		{ businessunitid: guid(101), name: "Remote Root" },
		{ businessunitid: guid(102), name: "Remote Sales" },
	];
	const remoteRoles = [
		{ roleid: guid(201), name: "Basic User", _businessunitid_value: guid(101) },
		{ roleid: guid(202), name: "Remote Manager", _businessunitid_value: guid(101) },
		{ roleid: guid(203), name: "System Administrator", _businessunitid_value: guid(101) },
		{ roleid: guid(204), name: "Basic User", _businessunitid_value: guid(102) },
	];
	const remoteUsers = [
		{ systemuserid: guid(301), fullname: "Remote Jane" },
		{ systemuserid: guid(302), fullname: "Remote John" },
	];
	const jsonResponse = (body, status = 200) =>
		new Response(body === undefined ? null : JSON.stringify(body), {
			status,
			headers: { "Content-Type": "application/json" },
		});
	const realFetch = window.fetch.bind(window);
	window.fetch = async (input, init) => {
		const url = typeof input === "string" ? input : input.url;
		if (url.includes("login.microsoftonline.")) {
			console.log("[harness] token request", url);
			return jsonResponse({ access_token: "harness-token", expires_in: 3600 });
		}
		const marker = "/api/data/v9.2/";
		const index = url.indexOf(marker);
		if (index < 0) {
			return realFetch(input, init);
		}
		const path = decodeURIComponent(url.slice(index + marker.length));
		const method = init?.method ?? "GET";
		console.log("[harness] dataverse", method, path.slice(0, 80));
		await new Promise((r) => setTimeout(r, 150));
		if (path.startsWith("WhoAmI")) {
			return jsonResponse({ UserId: guid(999), BusinessUnitId: guid(101), OrganizationId: guid(1) });
		}
		if (path.startsWith("roles?") && path.includes("link-entity")) {
			return jsonResponse({ value: remoteRoles.filter((r) => [guid(201), guid(203)].includes(r.roleid)) });
		}
		if (path.startsWith("roles?")) {
			return jsonResponse({ value: remoteRoles });
		}
		if (path.startsWith("businessunits?")) {
			return jsonResponse({ value: remoteUnits });
		}
		if (path.startsWith("systemusers?") && path.includes("businessunitid")) {
			return jsonResponse({ value: [{ systemuserid: guid(301) }] });
		}
		if (path.startsWith("systemusers?")) {
			return jsonResponse({ value: remoteUsers });
		}
		if (path.startsWith("environmentvariabledefinitions?")) {
			return jsonResponse({ value: environmentVariables.map(toDefinitionRecord) });
		}
		if (method === "POST" && path.startsWith("environmentvariablevalues")) {
			return jsonResponse({ environmentvariablevalueid: guid(870) }, 201);
		}
		if (path.startsWith("sdkmessageprocessingsteps?")) {
			return jsonResponse({ value: pluginSteps.map(toStepRecord) });
		}
		if (path.startsWith("sdkmessageprocessingsteps(")) {
			const step = pluginSteps.find((candidate) => path.includes(candidate.id));
			return step ? jsonResponse(toStepRecord(step)) : jsonResponse({ error: { message: "Not found" } }, 404);
		}
		if (path.startsWith("pluginassemblies?")) {
			return jsonResponse({ value: pluginAssemblies.map(toAssemblyRecord) });
		}
		if (path.startsWith("pluginassemblies(")) {
			const assembly = pluginAssemblies.find((candidate) => path.includes(candidate.id));
			return assembly ? jsonResponse(toAssemblyRecord(assembly)) : jsonResponse({ error: { message: "Not found" } }, 404);
		}
		if (path.startsWith("EntityDefinitions?")) {
			return jsonResponse({ value: transportEntities.map(toEntityDefinition) });
		}
		if (path.startsWith("EntityDefinitions(") && path.includes("LookupAttributeMetadata")) {
			return jsonResponse({
				value: transportAttributes
					.filter((a) => a.targets.length)
					.map((a) => ({ LogicalName: a.logicalName, Targets: a.targets.map((t) => t.logicalName) })),
			});
		}
		if (path.startsWith("EntityDefinitions(") && path.includes("ManyToOneRelationships")) {
			return jsonResponse({
				value: transportAttributes.flatMap((a) =>
					a.targets.map((t) => ({
						ReferencingAttribute: a.logicalName,
						ReferencedEntity: t.logicalName,
						ReferencingEntityNavigationPropertyName: t.navigationProperty,
					}))
				),
			});
		}
		if (path.startsWith("EntityDefinitions(")) {
			const logicalName = path.match(/LogicalName='([^']+)'/)?.[1];
			const entity = transportEntities.find((candidate) => candidate.logicalName === logicalName) ?? transportEntities[0];
			return jsonResponse({ ...toEntityDefinition(entity), Attributes: transportAttributes.map(toAttributeDefinition) });
		}
		if (path.startsWith("savedqueries?")) {
			return jsonResponse({
				value: transportViews.map((v) => ({
					savedqueryid: v.id,
					name: v.name,
					fetchxml: v.fetchXml,
					querytype: v.queryType,
					isdefault: v.isDefault,
				})),
			});
		}
		if (path.startsWith("accounts?fetchXml") && path.includes('operator="in"')) {
			const ids = [...path.matchAll(/<value>([^<]+)<\/value>/g)].map((match) => match[1]);
			return jsonResponse({ value: ids.filter((_, index) => index % 2 === 0).map((id) => ({ accountid: id })) });
		}
		if (path.startsWith("accounts?fetchXml")) {
			return jsonResponse({
				value: [...transportRows.slice(0, 60).map((row) => ({ accountid: row.accountid })), { accountid: guid(7999) }],
			});
		}
		if (path.startsWith("accounts?$skiptoken")) {
			return jsonResponse({ value: transportRows.slice(100) });
		}
		if (method === "POST" || method === "DELETE" || method === "PATCH") {
			return new Response(null, { status: 204 });
		}
		return jsonResponse({ error: { message: `harness: no fake response for ${method} ${path}` } }, 404);
	};

	const environmentVariables = [
		{
			id: guid(801),
			schemaName: "contoso_ApiBaseUrl",
			displayName: "API Base URL",
			description: "Base address of the integration API",
			type: 100000000,
			defaultValue: "https://api.contoso.com",
			currentValue: "https://api-dev.contoso.com",
			valueId: guid(851),
			isManaged: true,
			hint: null,
			valueSchema: null,
		},
		{
			id: guid(802),
			schemaName: "contoso_RetryCount",
			displayName: "Retry Count",
			description: null,
			type: 100000001,
			defaultValue: "3",
			currentValue: null,
			valueId: null,
			isManaged: false,
			hint: "Between 1 and 10",
			valueSchema: null,
		},
		{
			id: guid(803),
			schemaName: "contoso_NewPricing",
			displayName: "New Pricing Engine",
			description: "Turns on the new pricing engine",
			type: 100000002,
			defaultValue: "no",
			currentValue: "yes",
			valueId: guid(853),
			isManaged: false,
			hint: null,
			valueSchema: null,
		},
		{
			id: guid(804),
			schemaName: "contoso_RegionMapping",
			displayName: "Region Mapping",
			description: null,
			type: 100000003,
			defaultValue: null,
			currentValue: '{"na":"US","eu":"DE"}',
			valueId: guid(854),
			isManaged: false,
			hint: null,
			valueSchema: null,
		},
		{
			id: guid(805),
			schemaName: "contoso_SharePointSite",
			displayName: "SharePoint Site",
			description: null,
			type: 100000004,
			defaultValue: null,
			currentValue: '{"siteUrl":"https://contoso.sharepoint.com/sites/sales"}',
			valueId: guid(855),
			isManaged: true,
			hint: null,
			valueSchema: null,
		},
		{
			id: guid(806),
			schemaName: "contoso_ApiKey",
			displayName: "API Key",
			description: "Stored in Azure Key Vault",
			type: 100000005,
			defaultValue: null,
			currentValue: "/subscriptions/1/resourceGroups/rg/providers/Microsoft.KeyVault/vaults/kv/secrets/api-key",
			valueId: guid(856),
			isManaged: false,
			hint: null,
			valueSchema: null,
		},
	];
	const toDefinitionRecord = (variable) => ({
		environmentvariabledefinitionid: variable.id,
		schemaname: variable.schemaName,
		displayname: variable.displayName,
		description: variable.description,
		type: variable.type,
		defaultvalue: variable.defaultValue,
		ismanaged: variable.isManaged,
		hint: variable.hint,
		valueschema: variable.valueSchema,
		environmentvariabledefinition_environmentvariablevalue: variable.valueId
			? [{ environmentvariablevalueid: variable.valueId, value: variable.currentValue }]
			: [],
	});

	const pluginAssemblies = [
		{ id: guid(4100), name: "Contoso.Plugins", version: "1.0.0.0" },
		{ id: guid(4101), name: "Contoso.Workflows", version: "2.3.0.0" },
		{ id: guid(4102), name: "Fabrikam.Integration", version: "1.2.0.0" },
	];
	const pluginTypes = [
		{ id: guid(4200), name: "Contoso.Plugins.AccountPreCreate", assemblyId: guid(4100) },
		{ id: guid(4201), name: "Contoso.Plugins.ContactPostUpdate", assemblyId: guid(4100) },
		{ id: guid(4202), name: "Contoso.Workflows.SendNotification", assemblyId: guid(4101) },
		{ id: guid(4203), name: "Fabrikam.Integration.SyncOrders", assemblyId: guid(4102) },
	];
	const stepMessages = ["Create", "Update", "Delete", "Retrieve"];
	const stepEntities = ["account", "contact", "opportunity"];
	const pluginSteps = Array.from({ length: 12 }, (_, i) => {
		const type = pluginTypes[i % 4];
		const assembly = pluginAssemblies.find((candidate) => candidate.id === type.assemblyId);
		return {
			id: guid(4000 + i),
			name: `${type.name}: ${stepMessages[i % 4]} of ${stepEntities[i % 3]}`,
			stage: [10, 20, 40][i % 3],
			mode: i % 5 === 0 ? 1 : 0,
			rank: 1 + (i % 3),
			enabled: i % 4 !== 3,
			isManaged: i % 2 === 0,
			filteringAttributes: i % 2 ? "name,telephone1" : null,
			description: null,
			asyncAutoDelete: false,
			messageName: stepMessages[i % 4],
			primaryEntity: stepEntities[i % 3],
			pluginTypeId: type.id,
			pluginTypeName: type.name,
			pluginTypeFriendlyName: null,
			assemblyId: assembly.id,
			assemblyName: assembly.name,
			assemblyVersion: assembly.version,
		};
	});
	const toAssemblyRecord = (assembly) => ({
		pluginassemblyid: assembly.id,
		name: assembly.name,
		version: assembly.version,
	});
	const toStepRecord = (step) => ({
		sdkmessageprocessingstepid: step.id,
		name: step.name,
		stage: step.stage,
		mode: step.mode,
		rank: step.rank,
		statecode: step.enabled ? 0 : 1,
		statuscode: step.enabled ? 1 : 2,
		ismanaged: step.isManaged,
		filteringattributes: step.filteringAttributes,
		description: step.description,
		asyncautodelete: step.asyncAutoDelete,
		plugintypeid: {
			plugintypeid: step.pluginTypeId,
			typename: step.pluginTypeName,
			friendlyname: step.pluginTypeName.includes("Contact") ? "{9931d7aa-6062-4c4c-bfc8-ecd0302e164c}" : null,
			name: step.pluginTypeName,
			_pluginassemblyid_value: step.assemblyId,
		},
		sdkmessageid: { name: step.messageName },
		sdkmessagefilterid: { primaryobjecttypecode: step.primaryEntity },
	});

	const transportEntities = [
		{
			logicalName: "account",
			displayName: "Account",
			entitySetName: "accounts",
			primaryIdAttribute: "accountid",
			primaryNameAttribute: "name",
		},
		{
			logicalName: "contact",
			displayName: "Contact",
			entitySetName: "contacts",
			primaryIdAttribute: "contactid",
			primaryNameAttribute: "fullname",
		},
		{
			logicalName: "systemuser",
			displayName: "User",
			entitySetName: "systemusers",
			primaryIdAttribute: "systemuserid",
			primaryNameAttribute: "fullname",
		},
	];
	const transportViews = [
		{
			id: guid(6001),
			name: "Active Accounts",
			fetchXml:
				'<fetch><entity name="account"><attribute name="accountid" /><attribute name="name" /><attribute name="revenue" /><attribute name="primarycontactid" /><filter type="and"><condition attribute="statecode" operator="eq" value="0" /></filter></entity></fetch>',
			queryType: 0,
			isDefault: true,
		},
		{
			id: guid(6002),
			name: "My Active Accounts",
			fetchXml: '<fetch><entity name="account"><attribute name="name" /></entity></fetch>',
			queryType: 0,
			isDefault: false,
		},
	];
	const transportAttribute = (logicalName, displayName, attributeType, overrides = {}) => ({
		logicalName,
		displayName,
		attributeType,
		attributeOf: null,
		isPrimaryId: false,
		isValidForCreate: true,
		isValidForUpdate: true,
		isLogical: false,
		targets: [],
		...overrides,
	});
	const transportAttributes = [
		transportAttribute("accountid", "Account", "Uniqueidentifier", { isPrimaryId: true, isValidForUpdate: false }),
		transportAttribute("name", "Account Name", "String"),
		transportAttribute("revenue", "Annual Revenue", "Money"),
		transportAttribute("primarycontactid", "Primary Contact", "Lookup", {
			targets: [{ logicalName: "contact", navigationProperty: "primarycontactid" }],
		}),
		transportAttribute("ownerid", "Owner", "Owner", {
			targets: [{ logicalName: "systemuser", navigationProperty: "ownerid" }],
		}),
		transportAttribute("createdon", "Created On", "DateTime", { isValidForCreate: false, isValidForUpdate: false }),
	];
	const transportRows = Array.from({ length: 120 }, (_, i) => ({
		accountid: guid(7000 + i),
		name: `Account ${i}`,
		revenue: i * 1000,
		_primarycontactid_value: i % 3 ? guid(8000 + (i % 5)) : null,
		"_primarycontactid_value@Microsoft.Dynamics.CRM.lookuplogicalname": "contact",
		_ownerid_value: guid(501),
		createdon: new Date().toISOString(),
	}));
	const toEntityDefinition = (entity) => ({
		LogicalName: entity.logicalName,
		DisplayName: { UserLocalizedLabel: { Label: entity.displayName } },
		EntitySetName: entity.entitySetName,
		PrimaryIdAttribute: entity.primaryIdAttribute,
		PrimaryNameAttribute: entity.primaryNameAttribute,
	});
	const toAttributeDefinition = (attribute) => ({
		LogicalName: attribute.logicalName,
		DisplayName: { UserLocalizedLabel: { Label: attribute.displayName } },
		AttributeType: attribute.attributeType,
		AttributeOf: attribute.attributeOf,
		IsValidForCreate: attribute.isValidForCreate,
		IsValidForUpdate: attribute.isValidForUpdate,
		IsPrimaryId: attribute.isPrimaryId,
		IsLogical: attribute.isLogical,
	});
	const transportPageLink = "https://org12345.crm.dynamics.com/api/data/v9.2/accounts?$skiptoken=page2";

	const harnessFormAttributes = [
		{
			logicalName: "name",
			displayName: "Account Name",
			attributeType: "string",
			controls: [
				{
					name: "name",
					label: "Account Name",
					controlType: "standard",
					tab: "General",
					section: "Account Information",
					visible: true,
					disabled: false,
				},
			],
		},
		{
			logicalName: "telephone1",
			displayName: "Main Phone",
			attributeType: "string",
			controls: [
				{
					name: "telephone1",
					label: "Main Phone",
					controlType: "standard",
					tab: "General",
					section: "Account Information",
					visible: false,
					disabled: false,
				},
			],
		},
		{
			logicalName: "new_status",
			displayName: "Onboarding Status",
			attributeType: "optionset",
			controls: [
				{
					name: "new_status",
					label: "Onboarding Status",
					controlType: "optionset",
					tab: "Details",
					section: "Onboarding",
					visible: true,
					disabled: true,
				},
			],
		},
		{ logicalName: "new_creditlimit", displayName: "Credit Limit", attributeType: "money", controls: [] },
	];
	const responses = {
		"global.getPageContext": () => "model-driven-app",
		"global.showEnvironmentAlert": (args) => ({
			shown: !!args.alert?.enabled,
			reason: args.alert?.enabled ? "shown" : "disabled",
		}),
		"global.clearEnvironmentAlert": () => undefined,
		"transport.listEntities": () => transportEntities.map((entity) => ({ ...entity })),
		"codegen.getTableModel": ({ entityLogicalName }) => {
			const col = (o) => ({
				typeName: `${o.attributeType}Type`,
				attributeOf: null,
				isPrimaryId: false,
				isPrimaryName: false,
				isCustom: o.logicalName.startsWith("new_"),
				isLogical: false,
				isValidForCreate: true,
				isValidForUpdate: true,
				isValidForRead: true,
				requiredLevel: "None",
				maxLength: null,
				precision: null,
				dateTimeBehavior: null,
				dateTimeFormat: null,
				targets: [],
				optionSet: null,
				...o,
			});
			const name = entityLogicalName || "account";
			const title = name.charAt(0).toUpperCase() + name.slice(1);
			const status = {
				name: `new_${name}_new_status`,
				displayName: `new_${name}_new_status`,
				isGlobal: false,
				options: [
					{ value: 100000000, label: "New" },
					{ value: 100000001, label: "In Progress" },
					{ value: 100000002, label: "Done" },
				],
			};
			const industry = {
				name: "industrycode",
				displayName: "Industry",
				isGlobal: true,
				options: [
					{ value: 1, label: "Accounting" },
					{ value: 2, label: "Agriculture and Non-petrol Natural Resource Extraction" },
				],
			};
			return {
				logicalName: name,
				schemaName: title,
				displayName: title,
				displayCollectionName: `${title}s`,
				entitySetName: `${name}s`,
				primaryIdAttribute: `${name}id`,
				primaryNameAttribute: "name",
				isCustom: name.startsWith("new_"),
				columns: [
					col({
						logicalName: `${name}id`,
						schemaName: `${title}Id`,
						displayName: title,
						attributeType: "Uniqueidentifier",
						isPrimaryId: true,
						requiredLevel: "SystemRequired",
						isValidForUpdate: false,
					}),
					col({
						logicalName: "name",
						schemaName: "Name",
						displayName: `${title} Name`,
						attributeType: "String",
						isPrimaryName: true,
						requiredLevel: "ApplicationRequired",
						maxLength: 160,
					}),
					col({
						logicalName: "new_creditlimit",
						schemaName: "new_CreditLimit",
						displayName: "Credit Limit",
						attributeType: "Money",
						precision: 2,
					}),
					col({
						logicalName: "new_status",
						schemaName: "new_Status",
						displayName: "Onboarding Status",
						attributeType: "Picklist",
						optionSet: status,
					}),
					col({
						logicalName: "industrycode",
						schemaName: "IndustryCode",
						displayName: "Industry",
						attributeType: "Picklist",
						optionSet: industry,
					}),
					col({
						logicalName: "new_tags",
						schemaName: "new_Tags",
						displayName: "Tags",
						attributeType: "Virtual",
						typeName: "MultiSelectPicklistType",
						optionSet: {
							name: `new_${name}_new_tags`,
							displayName: `new_${name}_new_tags`,
							isGlobal: false,
							options: [
								{ value: 1, label: "Key Account" },
								{ value: 2, label: "Partner" },
							],
						},
					}),
					col({
						logicalName: "new_renewaldate",
						schemaName: "new_RenewalDate",
						displayName: "Renewal Date",
						attributeType: "DateTime",
						dateTimeBehavior: "DateOnly",
						dateTimeFormat: "DateOnly",
					}),
					col({
						logicalName: "createdon",
						schemaName: "CreatedOn",
						displayName: "Created On",
						attributeType: "DateTime",
						dateTimeBehavior: "UserLocal",
						dateTimeFormat: "DateAndTime",
						isValidForCreate: false,
						isValidForUpdate: false,
					}),
					col({
						logicalName: "ownerid",
						schemaName: "OwnerId",
						displayName: "Owner",
						attributeType: "Owner",
						requiredLevel: "SystemRequired",
						targets: [
							{ logicalName: "systemuser", navigationProperty: "ownerid", entitySetName: "systemusers" },
							{ logicalName: "team", navigationProperty: "ownerid", entitySetName: "teams" },
						],
					}),
					col({
						logicalName: "parentaccountid",
						schemaName: "ParentAccountId",
						displayName: "Parent Account",
						attributeType: "Lookup",
						targets: [{ logicalName: "account", navigationProperty: "parentaccountid", entitySetName: "accounts" }],
					}),
					col({
						logicalName: "parentaccountidname",
						schemaName: "ParentAccountIdName",
						displayName: "Parent Account",
						attributeType: "String",
						attributeOf: "parentaccountid",
						isLogical: true,
					}),
					col({
						logicalName: "versionnumber",
						schemaName: "VersionNumber",
						displayName: "Version Number",
						attributeType: "BigInt",
						isValidForCreate: false,
						isValidForUpdate: false,
					}),
				],
			};
		},
		"codegen.getGlobalChoices": () => [
			{
				name: "budgetstatus",
				displayName: "Budget Status",
				isGlobal: true,
				tableLogicalName: null,
				columnLogicalName: null,
				options: [
					{ value: 0, label: "No Committed Budget" },
					{ value: 1, label: "May Buy" },
					{ value: 2, label: "Can Buy" },
					{ value: 3, label: "Will Buy" },
				],
			},
			{
				name: "industrycode",
				displayName: "Industry",
				isGlobal: true,
				tableLogicalName: null,
				columnLogicalName: null,
				options: [
					{ value: 1, label: "Accounting" },
					{ value: 2, label: "Agriculture and Non-petrol Natural Resource Extraction" },
				],
			},
		],
		"investigate.listTables": () => transportEntities.map((entity) => ({ ...entity })),
		"investigate.getTableColumns": (args) => ({
			info: transportEntities.find((entity) => entity.logicalName === args.entityLogicalName) ?? transportEntities[0],
			attributes: transportAttributes.map((attribute) => ({ ...attribute })),
		}),
		"investigate.getRecordCounts": (args) => ({
			counts: args.entityLogicalNames
				.map((name, index) => ({ entityLogicalName: name, count: (index + 1) * 1373 }))
				.sort((left, right) => right.count - left.count),
			missing: [],
		}),
		"investigate.getTableAutomation": (args) => ({
			entityLogicalName: args.entityLogicalName,
			items: [
				...pluginSteps.slice(0, 2).map((step) => ({
					id: step.id,
					name: step.name,
					kind: "plugin",
					messages: [step.messageName],
					stage: step.stage,
					stageLabel: { 10: "Pre-validation", 20: "Pre-operation", 40: "Post-operation" }[step.stage] ?? null,
					mode: step.mode === 1 ? "async" : "sync",
					rank: step.rank,
					enabled: step.enabled,
					isManaged: step.isManaged,
					filteringAttributes: step.filteringAttributes ? step.filteringAttributes.split(",") : [],
					owner: step.pluginTypeName,
					description: null,
				})),
				{
					id: guid(912),
					name: "Notify owner on status change",
					kind: "flow",
					messages: ["Update"],
					stage: null,
					stageLabel: null,
					mode: null,
					rank: null,
					enabled: true,
					isManaged: false,
					filteringAttributes: ["statuscode"],
					owner: null,
					description: null,
				},
				{
					id: guid(913),
					name: "Require credit limit",
					kind: "businessrule",
					messages: ["Create", "Update"],
					stage: null,
					stageLabel: null,
					mode: "sync",
					rank: 1,
					enabled: true,
					isManaged: false,
					filteringAttributes: [],
					owner: null,
					description: null,
				},
			],
			registrations: [
				{
					id: guid(914),
					name: "Notify owner on status change",
					entityName: args.entityLogicalName,
					message: "Update",
					filteringAttributes: "statuscode",
				},
			],
			registrationsUnavailable: null,
			recentRuns: [
				{
					id: guid(915),
					name: "Notify owner on status change",
					statusLabel: "Failed",
					failed: true,
					message: "The flow run timed out after 30 seconds",
					startedOn: "2026-09-05T09:12:00Z",
					completedOn: "2026-09-05T09:12:30Z",
				},
				{
					id: guid(916),
					name: "Rollup field calculation",
					statusLabel: "Succeeded",
					failed: false,
					message: null,
					startedOn: "2026-09-05T08:00:00Z",
					completedOn: "2026-09-05T08:00:04Z",
				},
			],
			runsUnavailable: null,
		}),
		"investigate.getRecordAccess": (args) => ({
			entityLogicalName: args.entityLogicalName,
			recordId: args.recordId,
			systemUserId: args.systemUserId,
			userName: "Jane Doe",
			userBusinessUnitName: "Contoso Europe",
			rights: ["ReadAccess", "AppendToAccess"],
			ownerId: guid(920),
			ownerName: "John Smith",
			ownerType: "systemuser",
			ownerIsCurrentUser: false,
			recordBusinessUnitName: "Contoso",
			roles: [
				{ id: "r1", name: "Salesperson", businessUnitName: "Contoso Europe", viaTeam: null },
				{ id: "r3", name: "Marketing Reader", businessUnitName: null, viaTeam: "EMEA Marketing" },
			],
			teams: [
				{ id: "t1", name: "EMEA Marketing", teamTypeLabel: "Owner", isDefault: false },
				{ id: "t2", name: "Contoso Europe", teamTypeLabel: "Owner", isDefault: true },
			],
			privileges: [
				{ name: "prvReadAccount", depthLabel: "Basic", inheritedFromTeam: false },
				{ name: "prvAppendToAccount", depthLabel: "Local", inheritedFromTeam: false },
			],
			shares: [],
			sharesUnavailable: null,
			privilegesUnavailable: null,
		}),
		"investigate.getRecordHistory": (args) => ({
			entityLogicalName: args.entityLogicalName,
			recordId: args.recordId,
			entries: [
				{
					id: guid(930),
					createdOn: "2026-09-04T14:22:11Z",
					userId: "u1",
					userName: "Jane Doe",
					actionLabel: "Update",
					operationLabel: "Update",
				},
				{
					id: guid(931),
					createdOn: "2026-08-30T08:01:00Z",
					userId: "u2",
					userName: "John Smith",
					actionLabel: "Assign",
					operationLabel: "Update",
				},
			],
			truncated: false,
			configuration: {
				organizationEnabled: true,
				tableEnabled: true,
				auditedColumns: 18,
				totalColumns: 74,
				unauditedLookups: ["primarycontactid", "transactioncurrencyid"],
			},
			unavailable: null,
		}),
		"investigate.getAuditDetail": (args) => ({
			auditId: args.auditId,
			detailType: "Column changes",
			changes: [
				{ attribute: "name", oldValue: "Contoso Ltd", newValue: "Contoso Limited" },
				{ attribute: "revenue", oldValue: "100000", newValue: "250000" },
				{ attribute: "description", oldValue: null, newValue: "Key account" },
			],
			note: null,
		}),
		"investigate.getSolutionLayers": (args) => ({
			componentId: args.componentId,
			solutionComponentName: args.solutionComponentName,
			componentName: "Account Main Form",
			layers: [
				{
					order: 1,
					solutionName: "Active",
					publisherName: "Contoso",
					isManaged: false,
					version: null,
					changedOn: "2026-09-01T10:00:00Z",
				},
				{
					order: 2,
					solutionName: "ContosoSales",
					publisherName: "Contoso",
					isManaged: true,
					version: "2.4.1.0",
					changedOn: "2026-07-14T10:00:00Z",
				},
				{
					order: 3,
					solutionName: "System",
					publisherName: "Microsoft",
					isManaged: true,
					version: "9.2.0.0",
					changedOn: null,
				},
			],
			hasUnmanagedLayer: true,
			unavailable: null,
		}),
		"investigate.getColumnUsage": (args) => ({
			entityLogicalName: args.entityLogicalName,
			attributeLogicalName: args.attributeLogicalName,
			attributeDisplayName: "Status Reason",
			dependents: [
				{ id: guid(940), componentType: 60, componentTypeLabel: "Form", name: "Account Main Form", parentName: null },
				{ id: guid(941), componentType: 26, componentTypeLabel: "View", name: "Active Accounts", parentName: null },
				{
					id: guid(942),
					componentType: 29,
					componentTypeLabel: "Process",
					name: "Require credit limit",
					parentName: null,
				},
			],
			dependentsUnavailable: null,
			flows: args.scanFlows ? [{ id: guid(943), name: "Notify owner on status change", enabled: true, isManaged: false }] : [],
			flowsScanned: args.scanFlows ? 37 : 0,
			flowsUnavailable: null,
			steps: [
				{
					id: guid(944),
					name: "Contoso: Post-operation of account",
					messageName: "Update",
					filteringAttributes: "statuscode,name",
				},
			],
			stepsUnavailable: null,
		}),
		"investigate.getTableMetadata": (args) => ({
			logicalName: args.entityLogicalName,
			schemaName: "Account",
			displayName: "Account",
			collectionDisplayName: "Accounts",
			entitySetName: "accounts",
			primaryIdAttribute: "accountid",
			primaryNameAttribute: "name",
			objectTypeCode: 1,
			ownershipType: "UserOwned",
			isManaged: true,
			isCustomEntity: false,
			isAuditEnabled: true,
			changeTrackingEnabled: true,
			isActivity: false,
			isQuickCreateEnabled: true,
			isValidForAdvancedFind: true,
			hasNotes: true,
			hasActivities: true,
			attributeCount: 174,
			keys: [
				{
					logicalName: "contoso_accountnumberkey",
					displayName: "Account Number Key",
					attributes: ["accountnumber"],
					statusLabel: "Active",
				},
			],
			relationships: [
				{
					schemaName: "account_primary_contact",
					kind: "N:1",
					relatedEntity: "contact",
					navigationProperty: "primarycontactid",
					referencingAttribute: "primarycontactid",
					intersectEntity: null,
				},
				{
					schemaName: "account_parent_account",
					kind: "1:N",
					relatedEntity: "account",
					navigationProperty: "Referencedaccount_parent_account",
					referencingAttribute: "parentaccountid",
					intersectEntity: null,
				},
				{
					schemaName: "accountleads_association",
					kind: "N:N",
					relatedEntity: "lead",
					navigationProperty: "accountleads_association",
					referencingAttribute: null,
					intersectEntity: "accountleads",
				},
			],
		}),
		"forms.getFormDiagnostics": () => ({
			formId: guid(950),
			formName: "Account",
			entityLogicalName: "account",
			libraries: [
				{ name: "contoso_/js/account.js", order: 1 },
				{ name: "contoso_/js/shared.js", order: 2 },
			],
			handlers: [
				{
					event: "onload",
					target: null,
					library: "contoso_/js/account.js",
					functionName: "Contoso.Account.onLoad",
					enabled: true,
					passExecutionContext: true,
					parameters: null,
					order: 1,
				},
				{
					event: "onchange",
					target: "statuscode",
					library: "contoso_/js/account.js",
					functionName: "Contoso.Account.onStatusChange",
					enabled: true,
					passExecutionContext: true,
					parameters: null,
					order: 1,
				},
				{
					event: "onsave",
					target: null,
					library: "contoso_/js/shared.js",
					functionName: "Contoso.Shared.validate",
					enabled: false,
					passExecutionContext: false,
					parameters: "42",
					order: 1,
				},
			],
			controls: [
				{
					name: "name",
					label: "Account Name",
					controlType: "standard",
					tab: "General",
					section: "Summary",
					visible: true,
					disabled: false,
					requiredLevel: "required",
					hasValue: true,
				},
				{
					name: "creditlimit",
					label: "Credit Limit",
					controlType: "standard",
					tab: "General",
					section: "Billing",
					visible: false,
					disabled: false,
					requiredLevel: "required",
					hasValue: false,
				},
				{
					name: "accountnumber",
					label: "Account Number",
					controlType: "standard",
					tab: "General",
					section: "Summary",
					visible: true,
					disabled: true,
					requiredLevel: "none",
					hasValue: true,
				},
			],
			businessRules: [{ id: guid(951), name: "Require credit limit", enabled: true, scopeLabel: "Organization" }],
			businessRulesUnavailable: null,
			formXmlUnavailable: null,
		}),
		"utilities.getFormAttributes": () => harnessFormAttributes,
		"utilities.revealFormColumn": ({ logicalName, show }) => {
			const attribute = harnessFormAttributes.find((candidate) => candidate.logicalName === logicalName);
			if (!attribute) {
				return {
					logicalName,
					displayName: logicalName,
					attributeType: "",
					requiredLevel: "none",
					value: null,
					onForm: false,
					controls: [],
				};
			}
			console.log("[harness] revealFormColumn", logicalName, show);
			return {
				...attribute,
				requiredLevel: logicalName === "name" ? "required" : "none",
				value: logicalName === "name" ? "Contoso Ltd" : logicalName === "new_status" ? "In Progress (100000001)" : null,
				onForm: attribute.controls.length > 0,
				controls: attribute.controls.map((control) => ({ ...control, visible: show || control.visible })),
			};
		},
		"utilities.getRecordPayloadSource": () => ({
			entityLogicalName: "account",
			recordId: guid(960),
			values: {
				accountid: guid(960),
				name: "Contoso Ltd",
				new_creditlimit: 5000,
				"new_creditlimit@OData.Community.Display.V1.FormattedValue": "$5,000.00",
				new_status: 100000001,
				new_tags: "1,2",
				new_renewaldate: "2026-01-31",
				createdon: "2026-01-01T00:00:00Z",
				_parentaccountid_value: guid(961),
				"_parentaccountid_value@Microsoft.Dynamics.CRM.lookuplogicalname": "account",
				_ownerid_value: guid(301),
				"_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname": "systemuser",
				numberofemployees: 120,
				versionnumber: 99,
			},
		}),
		"utilities.getPageTarget": () => ({
			kind: "form",
			entityLogicalName: "account",
			recordId: guid(960),
			formId: guid(950),
			formName: "Account",
			viewId: null,
		}),
		"utilities.restoreFormState": (args) => ({ restored: args.snapshot.controls.length }),
		"utilities.getSessionSnapshot": () => ({
			user: {
				id: guid(970),
				name: "Jane Doe",
				businessUnitId: null,
				businessUnitName: "Contoso Europe",
				roles: ["Salesperson", "Environment Maker"],
				teams: ["EMEA Marketing", "Contoso Europe"],
			},
			organization: {
				version: "9.2.26094.00185",
				isAuditEnabled: true,
				pluginTraceLogSetting: "Exception",
				isDuplicateDetectionEnabled: false,
				backgroundProcessingDisabled: true,
			},
			app: { id: guid(971), name: "Sales Hub", uniqueName: "msdynce_saleshub" },
			page: {
				kind: "form",
				entityLogicalName: "account",
				recordId: guid(960),
				formId: guid(950),
				formName: "Account",
			},
			client: {
				client: "Web",
				formFactor: "1",
				languageId: 1033,
				timeZone: "0",
				baseCurrency: "US Dollar",
			},
			warnings: [],
		}),
		"transport.listViews": () => transportViews.map((view) => ({ ...view })),
		"transport.getEntityMetadata": (args) => ({
			info: transportEntities.find((entity) => entity.logicalName === args.logicalName) ?? transportEntities[0],
			attributes: transportAttributes.map((attribute) => ({ ...attribute })),
		}),
		"transport.retrievePage": (args) =>
			args.nextLink ? { rows: transportRows.slice(100), nextLink: null } : { rows: transportRows.slice(0, 100), nextLink: transportPageLink },
		"global.getSolutions": () => [
			{ id: "fd140aaf-4df4-11dd-bd17-0019b9312238", name: "Default Solution" },
			{ id: "s2", name: "Contoso Core" },
		],
		"settings.getEnvironmentDetails": () => ({
			environmentName: "org12345",
			environmentId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
			environmentType: "Commercial",
			modelDrivenAppUrl: "https://org12345.crm.dynamics.com/",
			powerPagesUrl: "https://org12345.powerappsportals.com/",
			geographicalRegion: "NA",
			organizationId: "99999999-9999-4999-8999-999999999999",
			tenantId: "77777777-7777-4777-8777-777777777777",
			blockedAttachments: "exe;bat;com",
			baseCurrency: "US Dollar",
		}),
		"utilities.refreshCommandBar": () => undefined,
		"utilities.generateFetchXml": () => [
			{
				name: "Current Record (account)",
				fetchXml:
					'<fetch><entity name="account"><attribute name="accountid" /><filter type="and"><condition attribute="accountid" operator="eq" value="abc" /></filter></entity></fetch>',
			},
			{
				name: "Contacts (contact_customer_accounts)",
				fetchXml: "<fetch version='1.0'><entity name='contact'><attribute name='fullname' /><order attribute='fullname' /></entity></fetch>",
			},
		],
		"utilities.generateUrls": () => ({
			appUrl: "https://org12345.crm.dynamics.com/main.aspx?appid=1",
			urls: [
				{
					name: "Current Record/View",
					url: "https://org12345.crm.dynamics.com/main.aspx?appid=1&pagetype=entityrecord&etn=account&id=abc",
				},
				{
					name: "Primary Contact (contact)",
					url: "https://org12345.crm.dynamics.com/main.aspx?appid=1&pagetype=entityrecord&etn=contact&id=def",
				},
			],
		}),
		"utilities.getWebApiUrl": () => "https://org12345.crm.dynamics.com/api/data/v9.2/",
		"utilities.toggleControlLogicalNames": () => ({ mode: "logical" }),
		"utilities.enableAdminMode": () => {
			const controls = [
				{ name: "name", label: "Account Name", visible: true, disabled: false, requiredLevel: "required" },
				{ name: "creditlimit", label: "Credit Limit", visible: false, disabled: false, requiredLevel: "required" },
				{ name: "accountnumber", label: "Account Number", visible: true, disabled: true, requiredLevel: "none" },
				{ name: "websiteurl", label: "Website", visible: true, disabled: false, requiredLevel: "none" },
				{ name: "ownerid", label: "Owner", visible: true, disabled: true, requiredLevel: "required" },
				{ name: "eyfrcc_shortname", label: "Short Name", visible: false, disabled: true, requiredLevel: "required" },
				{ name: "industrycode", label: "Industry", visible: true, disabled: false, requiredLevel: "recommended" },
			];
			return {
				total: controls.length,
				hidden: controls.filter((control) => !control.visible),
				disabled: controls.filter((control) => control.disabled),
				required: controls.filter((control) => control.requiredLevel === "required"),
				snapshot: { entityLogicalName: "account", formId: "form-1", controls },
			};
		},
		"utilities.getControlDetails": () => ({ entityName: "account", controlType: "form/edit", id: "form-1" }),
		"formPresets.captureFormValues": () => ({
			name: "Contoso",
			telephone1: "555-0100",
			revenue: 1000,
			primarycontactid: [{ id: "x", entityType: "contact", name: "Jane" }],
		}),
		"formPresets.applyFormValues": (args) => ({
			applied: Object.keys(args.fields).length - 1,
			skipped: [Object.keys(args.fields)[0]],
		}),
		"webapi.getAttributeMetadata": () => ({
			entityName: "account",
			entityId: "abc",
			attributes: [
				{
					logicalName: "accountcategorycode",
					displayName: "Category",
					attributeType: "Picklist",
					targets: [],
					options: [
						{ value: 1, label: "Preferred Customer" },
						{ value: 2, label: "Standard" },
					],
					dateTimeFormat: null,
				},
				{
					logicalName: "creditlimit",
					displayName: "Credit Limit",
					attributeType: "Money",
					targets: [],
					options: [],
					dateTimeFormat: null,
				},
				{
					logicalName: "description",
					displayName: "Description",
					attributeType: "Memo",
					targets: [],
					options: [],
					dateTimeFormat: null,
				},
				{
					logicalName: "donotemail",
					displayName: "Do not allow Emails",
					attributeType: "Boolean",
					targets: [],
					options: [
						{ value: 0, label: "Allow" },
						{ value: 1, label: "Do Not Allow" },
					],
					dateTimeFormat: null,
				},
				{
					logicalName: "lastonholdtime",
					displayName: "Last On Hold Time",
					attributeType: "DateTime",
					targets: [],
					options: [],
					dateTimeFormat: "DateAndTime",
				},
				{
					logicalName: "name",
					displayName: "Account Name",
					attributeType: "String",
					targets: [],
					options: [],
					dateTimeFormat: null,
				},
				{
					logicalName: "ownerid",
					displayName: "Owner",
					attributeType: "Owner",
					targets: [
						{ logicalName: "systemuser", navigationProperty: "ownerid" },
						{ logicalName: "team", navigationProperty: "ownerid" },
					],
					options: [],
					dateTimeFormat: null,
				},
				{
					logicalName: "parentaccountid",
					displayName: "Parent Account",
					attributeType: "Lookup",
					targets: [{ logicalName: "account", navigationProperty: "parentaccountid" }],
					options: [],
					dateTimeFormat: null,
				},
				{
					logicalName: "primarycontactid",
					displayName: "Primary Contact",
					attributeType: "Lookup",
					targets: [{ logicalName: "contact", navigationProperty: "primarycontactid" }],
					options: [],
					dateTimeFormat: null,
				},
			],
		}),
		"webapi.getRecordValues": () => ({
			name: "Contoso Ltd",
			creditlimit: 5000,
			"creditlimit@OData.Community.Display.V1.FormattedValue": "$5,000.00",
			accountcategorycode: 1,
			"accountcategorycode@OData.Community.Display.V1.FormattedValue": "Preferred Customer",
			_ownerid_value: "u1",
			"_ownerid_value@OData.Community.Display.V1.FormattedValue": "Jane Doe",
			"_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname": "systemuser",
		}),
		"webapi.updateField": () => undefined,
		"webapi.clearLookup": () => undefined,
		"forms.getForms": () => [
			{
				id: "form-1",
				name: "Account",
				type: 2,
				typeLabel: "Main",
				isManaged: false,
				isCustomizable: true,
				isActive: true,
			},
			{
				id: "form-2",
				name: "Account for Interactive experience",
				type: 12,
				typeLabel: "Main Interactive",
				isManaged: true,
				isCustomizable: true,
				isActive: true,
			},
			{
				id: "form-3",
				name: "Account Quick Create",
				type: 7,
				typeLabel: "Quick Create",
				isManaged: true,
				isCustomizable: false,
				isActive: false,
			},
		],
		"forms.getFormXml": (args) =>
			`<form><tabs><tab name="SUMMARY_TAB" id="{form-${args.formId}}" IsUserDefined="0" expanded="true"><labels><label description="Summary" languagecode="1033" /></labels><columns><column width="100%"><sections><section name="ACCOUNT_INFORMATION" showlabel="true" columns="11"><labels><label description="ACCOUNT INFORMATION" languagecode="1033" /></labels><rows><row><cell id="{c1}"><labels><label description="Account Name" languagecode="1033" /></labels><control id="name" classid="{4273EDBD-AC1D-40d3-9FB2-095C621B552D}" datafieldname="name" disabled="false" /></cell></row><row><cell id="{c2}"><labels><label description="Phone" languagecode="1033" /></labels><control id="telephone1" classid="{4273EDBD-AC1D-40d3-9FB2-095C621B552D}" datafieldname="telephone1" disabled="false" /></cell></row></rows></section></sections></column></columns></tab></tabs><header id="{h1}" celllabelposition="Top" columns="111" labelwidth="115" /></form>`,
		"forms.updateFormXml": () => undefined,
		"traces.query": (query) =>
			traceSamples
				.filter(
					(log) =>
						(!query.exceptionsOnly || log.exceptionDetails) &&
						(!query.correlationId || log.correlationId === query.correlationId.toLowerCase()) &&
						(!query.typeName || log.typeName.toLowerCase().includes(query.typeName.toLowerCase())) &&
						(!query.messageName || log.messageName.toLowerCase().includes(query.messageName.toLowerCase())) &&
						(!query.primaryEntity || log.primaryEntity.toLowerCase().includes(query.primaryEntity.toLowerCase()))
				)
				.slice(0, query.top),
		"traces.delete": (args) => ({ deleted: args.ids.length }),
		"traces.getSetting": () => 2,
		"traces.setSetting": () => undefined,
		"webapi.getEntityInfo": (args) =>
			entityInfos[args.logicalName] ?? {
				logicalName: args.logicalName,
				displayName: args.logicalName,
				entitySetName: `${args.logicalName}s`,
				primaryIdAttribute: `${args.logicalName}id`,
				primaryNameAttribute: "name",
			},
		"webapi.searchRecords": (args) => searchRecords(args.entityLogicalName, args.query, args.top),
		"webapi.executeFetchXml": () =>
			Array.from({ length: 120 }, (_, i) => ({
				"@odata.etag": 'W/"1"',
				accountid: `id-${i}`,
				name: `Account ${i}`,
				revenue: i * 100,
				"revenue@OData.Community.Display.V1.FormattedValue": `$${i * 100}.00`,
				statecode: i % 2,
			})),
		"security.getCurrentUser": () => ({ userId: "u1", userName: "Jane Doe", roleIds: ["r1", "r3"] }),
		"security.getSecurityRoles": () => roles,
		"security.getBusinessUnits": () => [
			{ id: "bu1", name: "Contoso" },
			{ id: "bu2", name: "Contoso Europe" },
		],
		"security.searchSystemUsers": (args) => [
			{ id: "u1", fullName: "Jane Doe", azureAdObjectId: guid(501), domainName: "jane@contoso.com", isDisabled: false },
			{
				id: "u2",
				fullName: `John ${args.query}`,
				azureAdObjectId: null,
				domainName: "john@contoso.com",
				isDisabled: true,
			},
		],
		"security.getUserSecurityRoles": (args) =>
			args.systemUserId === "u1" ? roles.filter((r) => ["r1", "r3"].includes(r.id)) : roles.filter((r) => r.id === "r1"),
		"security.getSystemUserRoles": (args) => (args.systemUserId === "u1" ? roles.filter((r) => ["r1", "r3", "r5"].includes(r.id)) : []),
		"security.applySecurityRoleChanges": () => undefined,
		"environmentVariables.getDefinitions": () => environmentVariables.map((variable) => ({ ...variable })),
		"environmentVariables.setValue": (args) => {
			const variable = environmentVariables.find((candidate) => candidate.id === args.definitionId);
			if (variable) {
				variable.currentValue = args.value;
				variable.valueId = variable.valueId ?? guid(870);
			}
			return { valueId: variable?.valueId ?? guid(870) };
		},
		"environmentVariables.clearValue": (args) => {
			const variable = environmentVariables.find((candidate) => candidate.valueId === args.valueId);
			if (variable) {
				variable.currentValue = null;
				variable.valueId = null;
			}
			return undefined;
		},
		"pluginSteps.getSteps": () => pluginSteps.map((step) => ({ ...step })),
		"pluginSteps.get": (args) => {
			const step = pluginSteps.find((candidate) => candidate.id === args.id);
			return step ? { ...step } : null;
		},
		"pluginSteps.setState": (args) => {
			args.ids.forEach((id) => {
				const step = pluginSteps.find((candidate) => candidate.id === id);
				if (step) {
					step.enabled = args.enabled;
				}
			});
			return { updated: args.ids.length, failed: [] };
		},
	};

	const traceTypes = ["Contoso.Plugins.AccountPreCreate", "Contoso.Plugins.ContactPostUpdate", "Contoso.Workflows.SendNotification"];
	const traceMessages = ["Create", "Update", "Retrieve", "Delete"];
	const traceEntities = ["account", "contact", "opportunity"];
	const traceSamples = Array.from({ length: 60 }, (_, i) => {
		const correlation = guid(1000 + Math.floor(i / 3));
		const target = guid(5000 + i);
		const failed = i % 7 === 0;
		const started = new Date(Date.now() - i * 90000);
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
			configuration: i % 2 ? "mode=verbose" : null,
			secureConfiguration: null,
		};
	});

	const seededPrincipals = {
		[guid(900)]: {
			id: guid(900),
			name: "Contoso app registration",
			tenantId: guid(901),
			clientId: guid(902),
			clientSecret: "harness-secret",
			notes: "Seeded by the harness",
		},
	};
	const seededEnvironments = {
		"env-dev": {
			id: "env-dev",
			name: "Contoso Dev",
			environmentType: "Commercial",
			modelDrivenAppUrl: "https://contoso-dev.crm.dynamics.com/",
			powerPagesUrl: "https://contoso-dev.powerappsportals.com/",
			environmentId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
			notes: "",
			servicePrincipalId: guid(900),
			alert: null,
		},
		"env-uat": {
			id: "env-uat",
			name: "Contoso UAT",
			environmentType: "GCC",
			modelDrivenAppUrl: "https://contoso-uat.crm9.dynamics.com/",
			powerPagesUrl: "",
			environmentId: "ffffffff-1111-4222-8333-444444444444",
			notes: "",
			servicePrincipalId: null,
			alert: null,
		},
	};
	const local = makeArea(
		{
			"Settings.extension": legacy["Settings.extension"],
			formPresets: {
				"model-driven-app": {
					"33333333-3333-4333-8333-333333333333": {
						id: "33333333-3333-4333-8333-333333333333",
						name: "Contact defaults",
						fields: { firstname: "Test", lastname: "User", donotemail: true },
					},
				},
				portal: {},
			},
			formPresets$: { v: 1 },
			codeTemplates: {
				"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": {
					id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
					name: "Contoso model",
					kind: "table",
					language: "csharp",
					filenamePattern: "{{table.identifier}}.cs",
					settings: [
						{ key: "namespace", label: "Namespace", default: "Contoso.Models" },
						{ key: "prefix", label: "Publisher prefixes to strip", default: "new" },
					],
					text: [
						"namespace {{settings.namespace}};",
						"",
						"public sealed class {{table.identifier}} : ContosoEntity",
						"{",
						"{{#columns}}",
						"    public {{type}} {{identifier}} { get; set; }",
						"{{/columns}}",
						"}",
						"",
					].join("\n"),
					builtIn: false,
					updatedAt: "2026-09-07T00:00:00.000Z",
				},
			},
			codeTemplates$: { v: 1 },
			codeTemplateDefaults: { table: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
			schemaVersion: 4,
			environments: seededEnvironments,
			environments$: { v: 3 },
			servicePrincipals: seededPrincipals,
			servicePrincipals$: { v: 1 },
		},
		"local"
	);
	const session = makeArea(
		{
			traceViewerLaunch: {
				tabId: 1,
				orgOrigin: "https://org12345.crm.dynamics.com",
				environmentName: "org12345",
				launchedAt: new Date().toISOString(),
			},
			transporterLaunch: {
				tabId: 1,
				orgOrigin: "https://org12345.crm.dynamics.com",
				environmentName: "org12345",
				launchedAt: new Date().toISOString(),
			},
		},
		"session"
	);
	const backgroundHandlers = {
		"impersonation.start": async ({ tabId, orgOrigin, user }) => {
			const header = user.azureAdObjectId ? "CallerObjectId" : "MSCRMCallerID";
			const state = { tabId, orgOrigin, user, header, startedAt: new Date().toISOString() };
			const current = (await session.get("impersonation")).impersonation ?? {};
			await session.set({ impersonation: { ...current, [tabId]: state } });
			return state;
		},
		"impersonation.stop": async ({ tabId }) => {
			const current = { ...((await session.get("impersonation")).impersonation ?? {}) };
			delete current[tabId];
			await session.set({ impersonation: current });
		},
		"impersonation.getState": async ({ tabId }) => (await session.get("impersonation")).impersonation?.[tabId] ?? null,
		"auth.ensureTokenOriginRule": async () => undefined,
	};
	window.chrome = {
		runtime: {
			id: "harness",
			getURL: (path) => new URL(path, location.href).toString(),
			lastError: undefined,
			onMessage: { addListener() {}, removeListener() {} },
			sendMessage: async (message) => {
				console.log("[harness] runtime.sendMessage", message);
				const handler = backgroundHandlers[message?.name];
				if (!handler) {
					return {
						ok: false,
						error: { name: "UnknownCommand", message: `harness: no background handler for ${message?.name}` },
					};
				}
				try {
					return { ok: true, value: await handler(message.args) };
				} catch (error) {
					return { ok: false, error: { name: "Error", message: String(error) } };
				}
			},
		},
		storage: { local, session, sync: makeArea({}), onChanged: local.onChanged },
		tabs: {
			query: async () => [{ id: 1, url: "https://org12345.crm.dynamics.com/main.aspx?appid=1&pagetype=entityrecord&etn=account&id=abc" }],
			create: async ({ url }) => {
				const harnessUrl = url
					.replace("results-viewer.html", "harness-results.html")
					.replace("plugin-traces.html", "harness-traces.html")
					.replace("data-transporter.html", "harness-transporter.html");
				console.log("[harness] tabs.create", url, "->", harnessUrl);
				window.open(harnessUrl, "_blank");
				return { id: 2 };
			},
			reload: async (tabId) => console.log("[harness] tabs.reload", tabId),
			get: async (tabId) => {
				if (closedTabs.has(tabId)) {
					throw new Error(`harness: tab ${tabId} is not open`);
				}
				return {
					id: tabId,
					windowId: 1,
					title: "Contoso Ltd - Account: Sales Hub",
					url: "https://org12345.crm.dynamics.com/main.aspx?appid=1&pagetype=entityrecord&etn=account&id=abc",
				};
			},
			update: async (tabId, properties) => {
				if (closedTabs.has(tabId)) {
					throw new Error(`harness: tab ${tabId} is not open`);
				}
				console.log("[harness] tabs.update", tabId, properties);
				return { id: tabId };
			},
			onRemoved: { addListener() {}, removeListener() {} },
			onUpdated: { addListener() {}, removeListener() {} },
		},
		windows: {
			getCurrent: async () => ({ id: 1, state: "normal", width: window.outerWidth, height: window.outerHeight }),
			create: async ({ url, width, height }) => {
				const harnessUrl = url.replace("popup.html", "harness");
				console.log("[harness] windows.create", url, "->", harnessUrl);
				window.open(harnessUrl, "_blank", `popup,width=${width},height=${height}`);
				return { id: 7 };
			},
			update: async (windowId, properties) => {
				if (windowId !== 1) {
					throw new Error(`harness: window ${windowId} is not open`);
				}
				console.log("[harness] windows.update", windowId, properties);
				return { id: windowId };
			},
		},
		permissions: {
			contains: async ({ origins = [] }) => origins.every((origin) => grantedOrigins.has(origin)),
			request: async ({ origins = [] }) => {
				console.log("[harness] permissions.request", origins);
				origins.forEach((origin) => grantedOrigins.add(origin));
				permissionListeners.added.forEach((listener) => listener({ origins }));
				return true;
			},
			onAdded: {
				addListener: (listener) => permissionListeners.added.push(listener),
				removeListener: (listener) => {
					permissionListeners.added = permissionListeners.added.filter((l) => l !== listener);
				},
			},
			onRemoved: { addListener() {}, removeListener() {} },
		},
		scripting: {
			executeScript: async (injection) => {
				if (injection.files) {
					return [{ frameId: 0 }];
				}
				const [name, args] = injection.args;
				const handler = responses[name];
				await new Promise((r) => setTimeout(r, 150));
				if (!handler) {
					return [
						{
							frameId: 0,
							result: { ok: false, error: { name: "UnknownCommand", message: `harness: no handler for ${name}` } },
						},
					];
				}
				try {
					return [{ frameId: 0, result: { ok: true, value: handler(args) } }];
				} catch (error) {
					return [{ frameId: 0, result: { ok: false, error: { name: "Error", message: String(error) } } }];
				}
			},
		},
	};
})();
