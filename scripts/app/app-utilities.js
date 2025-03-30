(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.App = global.EMC.App || {};
    global.EMC.App.Utilities = (function () {
        const category = "Utilities";

        function refreshCommandBar() {
            Xrm.Page.ui.refreshRibbon();

            EMC.App.Global.displayNotification(true, "Ribbon refreshed");
        }

        async function generateFetchXml() {
            const queries = Xrm.Page.data === null ? await retrieveSavedQueries() : generateRecordFetchXml();

            EMC.App.Global.sendExtensionMessage("handleFetchXmlResult", queries, category);
        }

        async function retrieveSavedQueries() {
            const queryParamRegex = /(?:&|\?)etn=([^&]+)/;
            const match = window.location.search.match(queryParamRegex);

            let entityName = null;
            if (match && match.length > 1) {
                entityName = match[1];
            } else {
                return null;
            }

            const query = `?$filter=returnedtypecode eq '${entityName}' and fetchxml ne null&$select=fetchxml,name&$orderby=name asc`;
            const response = await Xrm.WebApi.retrieveMultipleRecords("savedquery", query);
            if (!response || !response.entities || response.entities.length === 0) {
                EMC.App.Global.displayNotification(false, "No saved queries found");
                return;
            }

            return response.entities.map((e) => {
                return {
                    name: e.name,
                    fetchXml: e.fetchxml,
                };
            });
        }

        function generateRecordFetchXml() {
            if (!Xrm.Page.data.entity) {
                EMC.App.Global.displayNotification(false, "Could not obtain Fetch XML from record/view");
                return;
            }

            const recordQuery = createRecordQuery();
            const subgridQueries = createSubgridQueries();

            return [recordQuery].concat(subgridQueries);
        }

        function createRecordQuery() {
            const entityName = Xrm.Page.data.entity.getEntityName();
            const entityId = Xrm.Page.data.entity.getId();

            const recordFetchXml = `
                <fetch>
                    <entity name="${entityName}">
                        <attribute name="${entityName}id" />
                        <filter type="and">
                            <condition attribute="${entityName}id" operator="eq" value="${entityId}" />
                        </filter>
                    </entity>
                </fetch>`.replace(/  +|\n/g, "");

            return {
                name: `Current Record (${entityName})`,
                fetchXml: recordFetchXml,
            };
        }

        function createSubgridQueries() {
            const subgridControls = Xrm.Page.getControl().filter((c) => {
                return !(!c?.getFetchXml || !c.getFetchXml() || !c?.getRelationship || !c.getRelationship());
            });

            const subgridQueries = subgridControls.map((sc) => ({
                name: `${sc.getLabel()} (${sc.getRelationship().name})`,
                fetchXml: sc.getFetchXml(),
            }));

            return subgridQueries;
        }

        function generateUrls() {
            const urls = Xrm.Page.data !== null ? generateRecordUrls() : [{ name: "Current Record/View", url: window.location.href }];

            const response = {
                AppUrl: Xrm.Utility.getGlobalContext().getCurrentAppUrl(),
                Urls: urls,
            };

            EMC.App.Global.sendExtensionMessage("handleGenerateUrlsResult", response, category);
        }

        function generateRecordUrls() {
            const currentRecordUrl = generateRecordUrl();
            const lookupUrls = generateLookupUrls();

            return [currentRecordUrl].concat(lookupUrls);
        }

        function generateRecordUrl() {
            const entityName = Xrm.Page.data.entity.getEntityName();
            const entityId = Xrm.Page.data.entity.getId();
            const baseUrl = Xrm.Utility.getGlobalContext().getCurrentAppUrl();

            return {
                name: "Current Record/View",
                url: `${baseUrl}&pagetype=entityrecord&etn=${entityName}&id=${entityId}`,
            };
        }

        function generateLookupUrls() {
            const baseUrl = Xrm.Utility.getGlobalContext().getCurrentAppUrl();

            const lookupControls = Xrm.Page.getControl().filter((c) => {
                return c.getControlType() === "lookup" && c.getAttribute && c.getAttribute() && c.getAttribute().getValue();
            });

            const lookupUrls = lookupControls.map((c) => ({
                name: `${c.getLabel()} (${c.getAttribute().getValue()[0].entityType})`,
                url: `${baseUrl}&pagetype=entityrecord&etn=${c.getAttribute().getValue()[0].entityType}&id=${c.getAttribute().getValue()[0].id}`,
            }));

            return lookupUrls.reduce((unique, o) => {
                if (!unique.some((obj) => obj.url === o.url)) {
                    unique.push(o);
                }
                return unique;
            }, []);
        }

        function openWebApiUrl() {
            const clientUrl = Xrm.Utility.getGlobalContext().getClientUrl();
            EMC.App.Global.openUrlNewTab(`${clientUrl}${EMC.App.Constants.WebApiEndpoint}`);
        }

        function toggleControlLogicalNames() {
            const controls = Xrm.Page.getControl();
            if (!controls || controls.length === 0) {
                EMC.App.Global.displayNotification(false, "Could not find any controls on the form");
                return;
            }

            const toggleSchema = controls[0].getLabel() === controls[0].controlDescriptor.Label;

            controls.forEach((c) => {
                try {
                    const controlName = c.controlDescriptor.Name;
                    const controlLabel = c.controlDescriptor.Label ?? c._defaultLabel ?? null;
                    if (!controlName || !controlLabel) {
                        return;
                    }

                    toggleSchema ? c.setLabel(controlName) : c.setLabel(controlLabel);
                } catch (error) {
                    console.error(error);
                }
            });

            EMC.App.Global.displayNotification(true, `Successfully toggled control labels to display ${toggleSchema ? "logical names" : "control labels"}`);
        }

        function enableAdminMode() {
            try {
                setAttributesOptional();
                showAndEnableControls();

                const selectedTab = getSelectedTab();
                showTabsAndSections();
                focusAndExpandTab(selectedTab);
            } catch (error) {
                EMC.App.Global.displayNotification(false, `Error encountered: ${error.message}`);
                return;
            }

            EMC.App.Global.displayNotification(true, "Successfully enabled admin mode");
        }

        function setAttributesOptional() {
            Xrm.Page.data.entity.attributes.forEach((a) => a?.setRequiredLevel?.("none"));
        }

        function showAndEnableControls() {
            Xrm.Page.ui.controls.forEach((c) => {
                c?.setVisible?.(true);
                c?.setDisabled?.(false);
                c?.clearNotification?.();
            });
        }

        function getSelectedTab() {
            return Xrm.Page.ui.tabs.get((t) => t?.getDisplayState?.() === "expanded")[0];
        }

        function showTabsAndSections() {
            Xrm.Page.ui.tabs.forEach((t) => {
                t?.setVisible?.(true);
                t?.setDisplayState?.("expanded");
                tab.sections.forEach((s) => s?.setVisible?.(true));
            });
        }

        function focusAndExpandTab(tab) {
            tab?.setDisplayState?.("expanded");
            tab?.setFocus?.();
        }

        async function generateChoiceCodeSnippets() {
            try {
                const globalOptionSetMetadataResponse = await fetch(`${EMC.App.Constants.WebApiEndpoint}GlobalOptionSetDefinitions`);
                const globalOptionSetMetadata = await globalOptionSetMetadataResponse.json();

                const data = {
                    GlobalOptionSetMetadata: globalOptionSetMetadata.value
                        .filter((g) => g.OptionSetType === "Picklist")
                        .map((g) => {
                            return {
                                name: g?.DisplayName?.LocalizedLabels[0]?.Label,
                                options: g?.Options,
                            };
                        }),
                };

                if (Xrm.Page.data) {
                    const entityName = Xrm.Page.data.entity.getEntityName();
                    const [picklistMetadata, multiselectPicklistMetadata, booleanMetadata, stateMetadata, statusMetadata] = await Promise.all([
                        EMC.App.WebAPI.fetchChildAttributeMetadata(entityName, "Picklist"),
                        EMC.App.WebAPI.fetchChildAttributeMetadata(entityName, "MultiSelectPicklist"),
                        EMC.App.WebAPI.fetchChildAttributeMetadata(entityName, "Boolean"),
                        EMC.App.WebAPI.fetchChildAttributeMetadata(entityName, "State"),
                        EMC.App.WebAPI.fetchChildAttributeMetadata(entityName, "Status"),
                    ]);

                    data.PicklistMetadata = picklistMetadata.value
                        .concat(multiselectPicklistMetadata.value)
                        .concat(stateMetadata.value)
                        .concat(statusMetadata.value)
                        .map((p) => {
                            return {
                                name: p?.DisplayName?.LocalizedLabels[0]?.Label,
                                options: p?.OptionSet?.Options,
                            };
                        });
                    data.BooleanMetadata = booleanMetadata.value.map((b) => {
                        return {
                            name: b?.DisplayName?.LocalizedLabels[0]?.Label,
                            options: [b?.OptionSet?.FalseOption, b?.OptionSet?.TrueOption],
                        };
                    });
                    data.EntityName = entityName;
                }

                EMC.App.Global.sendExtensionMessage("handleChoiceCodeSnippetsResult", data, category);
            } catch (error) {
                EMC.App.Global.displayNotification(false, `Error encountered: ${error.message}`);
                return;
            }
        }

        async function retrieveControlDetails(args) {
            if (!Xrm || !Xrm.Page) {
                EMC.App.Global.displayNotification(false, `Please navigate to a form/view before attempting this action`);
                return;
            }

            let controlDetails = null;
            if (!args.controlToCheck) {
                controlDetails = !Xrm.Page.data ? retrieveViewControlDetails() : retrieveFormControlDetails();
                if (!controlDetails) {
                    EMC.App.Global.displayNotification(false, `Please navigate to a form/view before attempting this action`);
                    return;
                }

                EMC.App.Global.sendExtensionMessage(args.handler, controlDetails, category);
            }

            if (args.controlToCheck === "form") {
                controlDetails = Xrm.Page.data ? await retrieveFormControlDetails() : null;
                if (!controlDetails) {
                    EMC.App.Global.displayNotification(false, `Please navigate to a form before attempting this action`);
                    return;
                }

                EMC.App.Global.sendExtensionMessage(args.handler, controlDetails, category);
            }

            if (args.controlToCheck === "view") {
                controlDetails = !Xrm.Page.data ? retrieveViewControlDetails() : null;
                if (!controlDetails) {
                    EMC.App.Global.displayNotification(false, `Please navigate to a view before attempting this action`);
                    return;
                }
            }

            EMC.App.Global.sendExtensionMessage(args.handler, controlDetails, category);
        }

        async function retrieveFormControlDetails() {
            const entityName = Xrm.Page.data.entity.getEntityName();
            const formId = Xrm.Page.ui.formSelector.getCurrentItem().getId();
            const formXml = await retrieveFormXml(formId);

            return {
                entityName: entityName,
                controlType: "form/edit",
                id: formId,
                xml: formXml,
            };
        }

        async function retrieveFormXml(formId) {
            const response = await Xrm.WebApi.retrieveRecord("systemform", formId, "?$select=formxml");
            if (!response) {
                return null;
            }

            return response.formxml;
        }

        function retrieveViewControlDetails() {
            const entityName = EMC.App.Global.parseUrlQueryParameters("etn");
            if (!entityName) {
                return null;
            }

            const viewId = EMC.App.Global.parseUrlQueryParameters("viewid");
            if (!viewId) {
                return null;
            }

            return {
                entityName: entityName,
                controlType: "view",
                id: viewId,
            };
        }

        return {
            refreshCommandBar: refreshCommandBar,
            generateFetchXml: generateFetchXml,
            generateUrls: generateUrls,
            openWebApiUrl: openWebApiUrl,
            toggleControlLogicalNames: toggleControlLogicalNames,
            enableAdminMode: enableAdminMode,
            generateChoiceCodeSnippets: generateChoiceCodeSnippets,
            retrieveControlDetails: retrieveControlDetails
        };
    })();
})(this);
