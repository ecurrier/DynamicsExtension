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

        function generateFetchXml() {
            const queries = Xrm.Page.data === null ? parseForSavedQuery() : generateRecordFetchXml();

            EMC.App.Global.sendExtensionMessage("handleFetchXmlResult", queries, category);
        }

        async function parseForSavedQuery() {
            const savedQueryId = retrieveSavedQueryId();
            if (savedQueryId === null) {
                EMC.App.Global.displayNotification(false, "Could not obtain Fetch XML from record/view");
                return;
            }

            const response = await Xrm.WebApi.retrieveRecord("savedquery", savedQueryId, "?$select=fetchxml,name");
            if (!response) {
                EMC.App.Global.displayNotification(false, "Could not obtain Fetch XML from record/view");
                return;
            }

            return [{ name: response.name, fetchXml: response.fetchxml }];
        }

        function retrieveSavedQueryId() {
            const viewSelectorComponent = EMC.App.Global.parseDOM("[data-id*='ViewSelector']");
            if (!viewSelectorComponent || viewSelectorComponent.length === 0) {
                return null;
            }

            const dataId = viewSelectorComponent.attr("data-id");
            const viewRegex = /ViewSelector_([A-Za-z0-9]+(-[A-Za-z0-9]+)+)/;
            const match = dataId.match(viewRegex);

            let savedQueryId = null;
            if (match && match.length > 1) {
                savedQueryId = match[1];
            } else {
                return null;
            }

            return savedQueryId;
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

        function openUrlNewTab(url) {
            Xrm.Navigation.openUrl(url);

            EMC.App.Global.displayNotification(true);
        }

        function openWebApiUrl() {
            const clientUrl = Xrm.Utility.getGlobalContext().getClientUrl();
            Xrm.Navigation.openUrl(`${clientUrl}/api/data/v9.2`);

            EMC.App.Global.displayNotification(true);
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
            setAttributesOptional();
            showAndEnableControls();

            const selectedTab = getSelectedTab();
            showTabsAndSections();
            focusAndExpandTab(selectedTab);

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

        return {
            refreshCommandBar: refreshCommandBar,
            generateFetchXml: generateFetchXml,
            generateUrls: generateUrls,
            openUrlNewTab: openUrlNewTab,
            openWebApiUrl: openWebApiUrl,
            toggleControlLogicalNames: toggleControlLogicalNames,
            enableAdminMode: enableAdminMode,
        };
    })();
})(this);
