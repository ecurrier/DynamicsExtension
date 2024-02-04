(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.App = global.EMC.App || {};
    global.EMC.App.Settings = (function () {
        const category = "Settings";

        async function retrieveEnvironmentDetails(args) {
            if (!Xrm || !Xrm.Page || !Xrm.Page.context || !Xrm.Page.context.organizationSettings) {
                EMC.App.Global.displayNotification(false, null);
                return;
            }

            const organizationSettings = Xrm.Page.context.organizationSettings;

            const environmentDetails = {
                environmentName: organizationSettings.uniqueName,
                environmentId: organizationSettings.bapEnvironmentId,
                environmentType: retrieveEnvironmentType(organizationSettings),
                modelDrivenAppUrl: retrieveBaseUrl(),
                powerPagesUrl: await retrievePowerPagesUrl(),
                environmentGeographicalRegion: organizationSettings.organizationGeo,
                environmentOrganizationId: organizationSettings.organizationId,
                environmentOrganizationTenantId: organizationSettings.organizationTenant,
                environmentBlockedAttachments: organizationSettings.attributes.blockedattachments,
                environmentBaseCurrency: organizationSettings.baseCurrency?.name,
            };

            EMC.App.Global.sendExtensionMessage(args.callbackFunction, environmentDetails, args.category);
        }

        function retrieveEnvironmentType(organizationSettings) {
            if (!organizationSettings || !organizationSettings.isSovereignCloud) {
                return "Commercial";
            }

            const geo = organizationSettings.organizationGeo;
            switch (geo) {
                case "USG":
                    return "GCCHigh";
                default:
                    return "GCC";
            }
        }

        function retrieveBaseUrl() {
            const clientUrl = Xrm.Utility.getGlobalContext().getClientUrl();

            return formatUrl(clientUrl);
        }

        async function retrievePowerPagesUrl() {
            const fetchXml = `
                <fetch count="1">
                    <entity name="adx_website">
                        <attribute name="adx_websiteid" />
                        <attribute name="adx_primarydomainname" />
                        <filter type="and">
                            <condition attribute="statecode" operator="eq" value="0" />
                        </filter>
                    </entity>
                </fetch>`;

            const query = `?fetchXml=${fetchXml}`;

            try {
                const response = await Xrm.WebApi.retrieveMultipleRecords("adx_website", query);

                const website = response?.entities?.[0];
                const domainName = website?.adx_primarydomainname;

                return formatUrl(domainName);
            } catch (error) {
                return null;
            }
        }

        function formatUrl(baseUrl) {
            if (!baseUrl) {
                return null;
            }
        
            baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
            baseUrl = baseUrl.startsWith("https://") ? baseUrl : `https://${baseUrl}`;
        
            return baseUrl;
        }

        return {
            retrieveEnvironmentDetails: retrieveEnvironmentDetails,
        };
    })();
})(this);
