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
                EMC.App.Global.sendExtensionMessage("displayNotification", { success: false, text: "No users found" });
                return;
            }

            EMC.App.Global.sendExtensionMessage("populateSystemUserSelect", response.entities, category);
            EMC.App.Global.sendExtensionMessage("displayNotification", { success: true, text: `Successfully found ${response.entities.length} system users` });
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

        async function retrieveUserSecurityRoles(userId) {
            const fetchXml = `
                <fetch>
                    <entity name="role">
                        <attribute name="name" />
                        <attribute name="roleid" />
                        <order attribute="name" descending="false" />
                        <link-entity name="systemuserroles" from="roleid" to="roleid">
                            <link-entity name="systemuser" from="systemuserid" to="systemuserid">
                                <filter type="and">
                                    <condition attribute="systemuserid" operator="eq" value="${userId}" />
                                </filter>
                            </link-entity>
                        </link-entity>
                    </entity>
                </fetch>`;

            const query = `?fetchXml=${fetchXml}`;
            const response = await Xrm.WebApi.retrieveMultipleRecords("role", query);
            if (!response || !response.entities || response.entities.length === 0) {
                EMC.App.Global.sendExtensionMessage("displayNotification", { success: false, text: "Error occurred" });
                return;
            }

            EMC.App.Global.sendExtensionMessage("setSecurityRolesData", response.entities, category);
        }

        async function applySecurityRoleChanges(payload) {
            const associateResponse = await associateSecurityRoles(payload.associateRoleIds, payload.systemUserId);

            for (let i = 0; i < payload.disassociateRoleIds.length; i++) {
                let disassociateResponse = await disassociateSecurityRole(payload.disassociateRoleIds[i], payload.systemUserId);
            }

            EMC.App.Global.sendExtensionMessage("refreshSecurityRolesData", null, category);
            EMC.App.Global.sendExtensionMessage("displayNotification", { success: true, text: `Successfully applied security role changes` });
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
            retrieveUserSecurityRoles: retrieveUserSecurityRoles,
            applySecurityRoleChanges: applySecurityRoleChanges,
        };
    })();
})(this);
