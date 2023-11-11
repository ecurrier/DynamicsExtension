(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.App = global.EMC.App || {};
    global.EMC.App.WebAPI = (function () {
        const category = "WebAPI";

        async function loadAttributeMetadata() {
            const entityName = Xrm.Page.data.entity.getEntityName();
            const [attributeMetadata, picklistMetadata, booleanMetadata, stateMetadata, statusMetadata] = await Promise.all([
                fetchAttributeMetadata(entityName),
                fetchChildAttributeMetadata(entityName, "Picklist"),
                fetchChildAttributeMetadata(entityName, "Boolean"),
                fetchChildAttributeMetadata(entityName, "State"),
                fetchChildAttributeMetadata(entityName, "Status"),
            ]);

            const data = [attributeMetadata.Attributes, picklistMetadata.value.concat(stateMetadata.value).concat(statusMetadata.value), booleanMetadata.value];
            EMC.App.Global.sendExtensionMessage("populateAttributeMetadata", data, category);
        }

        async function fetchAttributeMetadata(entityName) {
            const response = await fetch(
                `${EMC.App.Constants.WebApiEndpoint}EntityDefinitions(LogicalName='${entityName}')?$select=LogicalName&$expand=Attributes($filter=AttributeType ne 'Virtual' and AttributeType ne 'Uniqueidentifier')`
            );
            return await response.json();
        }

        async function fetchChildAttributeMetadata(entityName, attributeType) {
            const response = await fetch(
                `${EMC.App.Constants.WebApiEndpoint}EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.${attributeType}AttributeMetadata?$expand=OptionSet`
            );
            return await response.json();
        }

        async function updateField(payload) {
            const formType = Xrm.Page.ui.getFormType();
            if (formType === EMC.App.Constants.FormTypes.Create) {
                return;
            }

            const entityName = Xrm.Page.data.entity.getEntityName();
            const entityId = Xrm.Page.data.entity.getId();

            if (payload[Object.keys(payload)[0]] === "null") {
                payload[Object.keys(payload)[0]] = null;
            }

            var response = await Xrm.WebApi.updateRecord(entityName, entityId, payload);
            if (!response || !response.entityType) {
                EMC.App.Global.sendExtensionMessage("displayNotification", { sucess: false, text: "Error occurred" });
                return;
            }

            EMC.App.Global.sendExtensionMessage("displayNotification", { sucess: true, text: "Update complete" });
        }

        return {
            loadAttributeMetadata: loadAttributeMetadata,
            updateField: updateField,
        };
    })();
})(this);
