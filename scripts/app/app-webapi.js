(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.App = global.EMC.App || {};
    global.EMC.App.WebAPI = (function () {
        const category = "WebAPI";

        async function loadAttributeMetadata(refreshForm = false) {
            if (!Xrm.Page || !Xrm.Page.data || !Xrm.Page.data.entity) {
                EMC.App.Global.displayNotification(false, "Please navigate to a record before loading attribute metadata");
                return;
            }

            const entityName = Xrm.Page.data.entity.getEntityName();
            const [attributeMetadata, picklistMetadata, multiselectPicklistMetadata, booleanMetadata, stateMetadata, statusMetadata] = await Promise.all([
                fetchAttributeMetadata(entityName),
                fetchChildAttributeMetadata(entityName, "Picklist"),
                fetchChildAttributeMetadata(entityName, "MultiSelectPicklist"),
                fetchChildAttributeMetadata(entityName, "Boolean"),
                fetchChildAttributeMetadata(entityName, "State"),
                fetchChildAttributeMetadata(entityName, "Status"),
            ]);

            const recordValues = await retrieveRecordValues(entityName);
            const data = {
                AttributeMetadata: attributeMetadata.Attributes.filter((a) => {
                    return (
                        a.AttributeOf == null &&
                        (a.AttributeType !== "Virtual" || (a.AttributeType === "Virtual" && a?.AttributeTypeName?.Value === "MultiSelectPicklistType"))
                    );
                }),
                PicklistMetadata: picklistMetadata.value.concat(multiselectPicklistMetadata.value).concat(stateMetadata.value).concat(statusMetadata.value),
                BooleanMetadata: booleanMetadata.value,
                RecordValues: recordValues,
                RefreshForm: refreshForm,
            };

            EMC.App.Global.sendExtensionMessage("populateAttributeMetadata", data, category);
            EMC.App.Global.displayNotification(true, "Successfully loaded attribute metadata");
        }

        async function retrieveRecordValues(entityName) {
            const entityId = Xrm.Page.data.entity.getId();

            const response = await Xrm.WebApi.retrieveRecord(entityName, entityId);
            if (!response) {
                return;
            }

            return response;
        }

        async function fetchAttributeMetadata(entityName) {
            const response = await fetch(
                `${EMC.App.Constants.WebApiEndpoint}EntityDefinitions(LogicalName='${entityName}')?$select=LogicalName&$expand=Attributes($filter=AttributeType ne 'Uniqueidentifier')`
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

            let response = null;
            try {
                response = await Xrm.WebApi.updateRecord(entityName, entityId, payload);
            } catch (error) {
                EMC.App.Global.displayNotification(false, error.message);
                return;
            }

            if (!response || !response.entityType) {
                EMC.App.Global.displayNotification(false, "Error occurred");
                return;
            }

            EMC.App.Global.sendExtensionMessage("refreshForm", null, "WebAPI");
            EMC.App.Global.displayNotification(true, "Update complete");
        }

        async function executeFetchXml(fetchXml) {
            const regex = /<entity[^>]*name=['"]([^'"]*)['"]/;
            const match = fetchXml.match(regex);

            let entityName = null;
            if (match && match.length > 1) {
                entityName = match[1];
            } else {
                EMC.App.Global.displayNotification(false, "Entity name not found in XML");
                return;
            }

            const query = `?fetchXml=${fetchXml}`;
            let response = null;
            try {
                response = await Xrm.WebApi.retrieveMultipleRecords(entityName, query);
            } catch (error) {
                EMC.App.Global.displayNotification(false, error.message);
                return;
            }

            EMC.App.Global.sendExtensionMessage("populateResultsTable", response.entities, category);
            EMC.App.Global.displayNotification(true, "Successfully executed Fetch XML");
        }

        return {
            fetchAttributeMetadata: fetchAttributeMetadata,
            fetchChildAttributeMetadata: fetchChildAttributeMetadata,
            loadAttributeMetadata: loadAttributeMetadata,
            updateField: updateField,
            executeFetchXml: executeFetchXml,
        };
    })();
})(this);
