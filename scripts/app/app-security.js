(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.App = global.EMC.App || {};
    global.EMC.App.Security = (function () {
        const category = "Security";

        async function retrieveSystemUsers(payload) {
            const fetchXml = `
                <fetch>
                    <entity name="systemuser">
                        <attribute name="fullname" />
                        <attribute name="systemuserid" />
                        <filter type="or">
                            <condition attribute="domainname" operator="like" value="%${payload.query}%" />
                            <condition attribute="internalemailaddress" operator="like" value="%${payload.query}%" />
                            <condition attribute="fullname" operator="like" value="%${payload.query}%" />
                        </filter>
                    </entity>
                </fetch>`;

            const query = `?fetchXml=${fetchXml}`;
            const response = await Xrm.WebApi.retrieveMultipleRecords("systemuser", query);
            if (!response || !response.entities || response.entities.length === 0) {
                EMC.App.Global.displayNotification(false, "No users found");
                return;
            }

            EMC.App.Global.sendExtensionMessage("populateSystemUserSelect", response.entities, category);
            EMC.App.Global.displayNotification(true, `Successfully found ${response.entities.length} system users`);
        }

        function retrieveCurrentUserDetails() {
            const userSettings = Xrm.Utility.getGlobalContext().userSettings;
            if (!userSettings) {
                return;
            }

            const userId = userSettings.userId;
            const userName = userSettings.userName;
            const securityRoles = userSettings.roles.getAll();

            const data = {
                userId: userId,
                userName: userName,
                securityRoles: securityRoles,
            };

            EMC.App.Global.sendExtensionMessage("initializeCurrentUserDetails", data, category);
        }

        async function retrieveAllSecurityRoleDetails() {
            const fetchXml = `
                <fetch>
                    <entity name="role">
                        <attribute name="name" />
                        <attribute name="roleid" />
                        <attribute name="businessunitid" />
                        <order attribute="name" descending="false" />
                        <filter type="and">
                            <condition attribute="componentstate" operator="eq" value="0" />
                        </filter>
                    </entity>
                </fetch>`;

            const query = `?fetchXml=${fetchXml}`;
            const response = await Xrm.WebApi.retrieveMultipleRecords("role", query);
            if (!response || !response.entities || response.entities.length === 0) {
                return;
            }

            EMC.App.Global.sendExtensionMessage("initializeSecurityRoleDetails", response.entities, category);
        }

        async function retrieveBusinessUnits() {
            const fetchXml = `
                <fetch>
                    <entity name="businessunit">
                        <attribute name="businessunitid" />
                        <attribute name="name" />
                        <filter type="and">
                            <condition attribute="isdisabled" operator="eq" value="0" />
                        </filter>
                    </entity>
                </fetch>`;

            const query = `?fetchXml=${fetchXml}`;
            const response = await Xrm.WebApi.retrieveMultipleRecords("businessunit", query);
            if (!response || !response.entities || response.entities.length === 0) {
                return;
            }

            EMC.App.Global.sendExtensionMessage("initializeBusinessUnits", response.entities, category);
        }

        async function retrieveUserSecurityRoles(userDetails) {
            const systemuserFetchXml = `
                <fetch>
                    <entity name="systemuser">
                        <attribute name="fullname" />
                        <attribute name="systemuserid" />
                        <filter type="and">
                            <condition attribute="systemuserid" operator="eq" value="${userDetails.systemuserid}" />
                            <condition attribute="businessunitid" operator="eq" value="${userDetails.businessunitid}" />
                        </filter>
                    </entity>
                </fetch>`;

            const systemuserQuery = `?fetchXml=${systemuserFetchXml}`;
            const systemuserResponse = await Xrm.WebApi.retrieveMultipleRecords("systemuser", systemuserQuery);
            if (!systemuserResponse || !systemuserResponse.entities || systemuserResponse.entities.length === 0) {
                EMC.App.Global.displayNotification(false, "Selected user does not belong to this Business Unit");
                return;
            }

            const roleFetchXml = `
                <fetch>
                    <entity name="role">
                        <attribute name="name" />
                        <attribute name="roleid" />
                        <order attribute="name" descending="false" />
                        <link-entity name="systemuserroles" from="roleid" to="roleid">
                            <link-entity name="systemuser" from="systemuserid" to="systemuserid">
                                <filter type="and">
                                    <condition attribute="systemuserid" operator="eq" value="${userDetails.systemuserid}" />
                                    <condition attribute="businessunitid" operator="eq" value="${userDetails.businessunitid}" />
                                </filter>
                            </link-entity>
                        </link-entity>
                    </entity>
                </fetch>`;

            const roleQuery = `?fetchXml=${roleFetchXml}`;
            const roleResponse = await Xrm.WebApi.retrieveMultipleRecords("role", roleQuery);
            if (!roleResponse || !roleResponse.entities) {
                EMC.App.Global.displayNotification(false, "Error occurred");
                return;
            }

            EMC.App.Global.sendExtensionMessage("setSecurityRolesData", roleResponse.entities, category);
        }

        async function applySecurityRoleChanges(payload) {
            const associateResponse = await associateSecurityRoles(payload.associateRoleIds, payload.systemUserId);

            for (let i = 0; i < payload.disassociateRoleIds.length; i++) {
                let disassociateResponse = await disassociateSecurityRole(payload.disassociateRoleIds[i], payload.systemUserId);
            }

            EMC.App.Global.sendExtensionMessage("refreshSecurityRolesData", null, category);
            EMC.App.Global.displayNotification(true, "Successfully applied security role changes");
        }

        async function associateSecurityRoles(roleIds, systemUserId) {
            if (!roleIds || roleIds.length === 0) {
                return;
            }

            const manyToOneAssociateRequest = {
                getMetadata: () => ({
                    boundParameter: null,
                    parameterTypes: {},
                    operationType: 2,
                    operationName: "Associate",
                }),
                relationship: "systemuserroles_association",
                target: {
                    entityType: "systemuser",
                    id: systemUserId,
                },
                relatedEntities: roleIds.map((roleId) => {
                    return {
                        entityType: "role",
                        id: roleId,
                    };
                }),
            };

            return await Xrm.WebApi.online.execute(manyToOneAssociateRequest);
        }

        async function disassociateSecurityRole(roleId, systemUserId) {
            const manyToManyDisassociateRequest = {
                getMetadata: () => ({
                    boundParameter: null,
                    parameterTypes: {},
                    operationType: 2,
                    operationName: "Disassociate",
                }),
                relationship: "systemuserroles_association",
                target: {
                    entityType: "systemuser",
                    id: systemUserId,
                },
                relatedEntityId: roleId,
            };

            return await Xrm.WebApi.online.execute(manyToManyDisassociateRequest);
        }

        return {
            retrieveSystemUsers: retrieveSystemUsers,
            retrieveCurrentUserDetails: retrieveCurrentUserDetails,
            retrieveAllSecurityRoleDetails: retrieveAllSecurityRoleDetails,
            retrieveBusinessUnits: retrieveBusinessUnits,
            retrieveUserSecurityRoles: retrieveUserSecurityRoles,
            applySecurityRoleChanges: applySecurityRoleChanges,
        };
    })();
})(this);
