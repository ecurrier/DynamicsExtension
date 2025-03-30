(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.App = global.EMC.App || {};
    global.EMC.App.Templates = (function () {
        const category = "Templates";

        function generateNewTemplate() {
            let formJson = {};

            const pageContext = EMC.App.Global.getPageContext();
            switch (pageContext) {
                case EMC.App.Constants.PageContexts.ModelDrivenApp:
                    if (!Xrm.Page || !Xrm.Page.data || !Xrm.Page.data.entity) {
                        EMC.App.Global.displayNotification(false, "Please navigate to a record before applying a template");
                        return;
                    }

                    formJson = retrieveAppFormJSON();
                    break;
                case EMC.App.Constants.PageContexts.Portal:
                    formJson = retrievePortalFormJSON();
                    break;
                default:
                    return;
            }

            EMC.App.Global.sendExtensionMessage("loadNewTemplate", formJson, category);
        }

        function retrieveAppFormJSON() {
            let formJson = {};

            const formFields = Xrm.Page.data.entity.attributes;
            formFields.forEach((attribute, index) => {
                const attributeName = attribute.getName();
                const attributeValue = attribute.getValue();
                if (attributeValue === null) {
                    return;
                }

                formJson[attributeName] = attributeValue;
            });

            return formJson;
        }

        function retrievePortalFormJSON() {
            let formJson = {};

            const inputs = $(".crmEntityFormView .control > .form-control:not([type='hidden'])");
            $.each(inputs, function (index, input) {
                const attributeName = $(input).attr("id");
                const attributeValue = $(input).val() !== "" ? $(input).val() : null;
                if (attributeValue === null) {
                    return;
                }

                formJson[attributeName] = attributeValue;
            });

            return formJson;
        }

        function populateFieldsFromTemplate(json) {
            const pageContext = EMC.App.Global.getPageContext();
            switch (pageContext) {
                case EMC.App.Constants.PageContexts.ModelDrivenApp:
                    populateAppFormFromTemplate(json);
                    break;
                case EMC.App.Constants.PageContexts.Portal:
                    populatePortalFormFromTemplate(json);
                    break;
                default:
                    return;
            }

            EMC.App.Global.displayNotification(true, "Successfully applied template");
        }

        function populateAppFormFromTemplate(json) {
            const keys = Object.keys(json);
            keys.forEach((key) => {
                try {
                    const attribute = Xrm.Page.getAttribute(key);
                    let value = json[key];

                    if (attribute.getAttributeType() === "datetime") {
                        value = new Date(value);
                    }

                    Xrm.Page.getAttribute(key).setValue(value);
                } catch (error) {
                    console.error(error);
                }
            });
        }

        function populatePortalFormFromTemplate(json) {
            const keys = Object.keys(json);
            keys.forEach((key) => {
                try {
                    const $input = $(`#${key}`);
                    const value = json[key];

                    $input.val(value);
                } catch (error) {
                    console.error(error);
                }
            });
        }

        async function generateNewTemplateFromRecord() {
            let formJson = {};

            const pageContext = EMC.App.Global.getPageContext();
            switch (pageContext) {
                case EMC.App.Constants.PageContexts.ModelDrivenApp:
                    if (!Xrm.Page || !Xrm.Page.data || !Xrm.Page.data.entity) {
                        EMC.App.Global.displayNotification(false, "Please navigate to a record before attempting to export");
                        return;
                    }

                    formJson = await retrieveRecordData();
                    break;
                default:
                    return;
            }

            EMC.App.Global.sendExtensionMessage("loadNewTemplate", formJson, category);
        }

        async function retrieveRecordData() {
            const recordId = Xrm.Page.data.entity.getId();
            const recordLogicalName = Xrm.Page.data.entity.getEntityName();

            const response = await Xrm.WebApi.retrieveRecord(recordLogicalName, recordId);
            if (!response) {
                EMC.App.Global.displayNotification(false, "Unexpected error occurred. Unable to export record.");
                return;
            }

            const lookupAttributeMetadata = await fetchAttributeMetadata(recordLogicalName);

            sanitizeResponse(response);
            const formattedResponse = formatResponse(response, lookupAttributeMetadata);

            return {
                logicalName: recordLogicalName,
                id: recordId,
                attributes: formattedResponse
            };
        }

        const blacklistedFields = [
            "_ownerid_value",
            "_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname",
            "_owninguser_value",
            "_owninguser_value@Microsoft.Dynamics.CRM.lookuplogicalname",
            "_owningbusinessunit_value",
            "_owningbusinessunit_value@Microsoft.Dynamics.CRM.lookuplogicalname",
            "_createdby_value",
            "_createdby_value@Microsoft.Dynamics.CRM.lookuplogicalname",
            "createdon",
            "_modifiedby_value",
            "_modifiedby_value@Microsoft.Dynamics.CRM.lookuplogicalname",
            "modifiedon",
        ];

        const blacklistedEndings = ["@OData.Community.Display.V1.FormattedValue", "@Microsoft.Dynamics.CRM.associatednavigationproperty", "_base"];

        function sanitizeResponse(response) {
            Object.keys(response).forEach((key) => {
                if (response[key] === null || blacklistedEndings.some((ending) => key.endsWith(ending)) || blacklistedFields.includes(key)) {
                    delete response[key];
                }
            });
        }

        async function fetchAttributeMetadata(entityName) {
            const response = await fetch(
                `${EMC.App.Constants.WebApiEndpoint}EntityDefinitions(LogicalName='${entityName}')?$select=LogicalName&$expand=Attributes($filter=AttributeType eq 'Lookup' or AttributeType eq 'Customer')`
            );
            return await response.json();
        }

        function formatResponse(response, lookupAttributeMetadata) {
            let parsedResponse = { ...response };
            const deleteParsedResponseKeys = (keys) => {
                keys.forEach((key) => delete parsedResponse[key]);
            };

            for (const key in response) {
                if (!(key.startsWith("_") && key.endsWith("_value"))) {
                    continue;
                }

                const lookupKey = `${key}@Microsoft.Dynamics.CRM.lookuplogicalname`;
                const entityLogicalName = response[lookupKey];
                if (!entityLogicalName) {
                    deleteParsedResponseKeys([key, lookupKey]);
                    continue;
                }

                const fieldName = key.slice(1, -6);
                const attributeMetadata = lookupAttributeMetadata.Attributes.find((lam) => lam.LogicalName === fieldName);
                if (!attributeMetadata) {
                    deleteParsedResponseKeys([key, lookupKey]);
                    continue;
                }

                const entityCollectionName = EMC.App.Global.getPluralName(entityLogicalName);
                const newKey = `${attributeMetadata.SchemaName}${attributeMetadata.Targets.length > 1 ? `_${entityLogicalName}` : ""}@odata.bind`;
                parsedResponse[newKey] = `/${entityCollectionName}(${parsedResponse[key]})`;

                deleteParsedResponseKeys([key, lookupKey]);
            }

            return parsedResponse;
        }

        function upsertRecordFromTemplate(entity) {
            debugger;
        }

        return {
            generateNewTemplate: generateNewTemplate,
            populateFieldsFromTemplate: populateFieldsFromTemplate,
            generateNewTemplateFromRecord: generateNewTemplateFromRecord,
            upsertRecordFromTemplate: upsertRecordFromTemplate,
        };
    })();
})(this);
