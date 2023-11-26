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
            Xrm.Page.data === null ? parseForSavedQuery() : generateRecordFetchXml();
        }

        async function parseForSavedQuery() {
            const savedQueryId = retrieveSavedQueryId();
            if (savedQueryId === null) {
                EMC.App.Global.displayNotification(false, "Could not obtain Fetch XML from record/view");
                return;
            }

            const response = await Xrm.WebApi.retrieveRecord("savedquery", savedQueryId, "?$select=fetchxml");
            if (!response) {
                EMC.App.Global.displayNotification(false, "Could not obtain Fetch XML from record/view");
                return;
            }

            EMC.App.Global.sendExtensionMessage("handleFetchXmlResult", response.fetchxml, category);
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

            const entityName = Xrm.Page.data.entity.getEntityName();
            const entityId = Xrm.Page.data.entity.getId();

            const fetchXml = `
                <fetch>
                    <entity name="${entityName}">
                        <attribute name="${entityName}id" />
                        <filter type="and">
                            <condition attribute="${entityName}id" operator="eq" value="${entityId}" />
                        </filter>
                    </entity>
                </fetch>`.replace(/  +|\n/g, "");

            EMC.App.Global.sendExtensionMessage("handleFetchXmlResult", fetchXml, category);
        }

        return {
            refreshCommandBar: refreshCommandBar,
            generateFetchXml: generateFetchXml,
        };
    })();
})(this);
