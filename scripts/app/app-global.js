(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.App = global.EMC.App || {};
    global.EMC.App.Global = (function () {
        const category = "Global";
        let pageContext = null;

        function sendExtensionMessage(command, data, namespace = category) {
            chrome.runtime.sendMessage(document.getElementById("extension-id").value, {
                category: namespace,
                command: command,
                data: data,
            });
        }

        function displayNotification(success, message) {
            sendExtensionMessage("displayNotification", { success: success, text: message });
        }

        function initializePageContext() {
            pageContext = window.Xrm ? EMC.App.Constants.PageContexts.ModelDrivenApp : window.portal ? EMC.App.Constants.PageContexts.Portal : null;
            EMC.App.Global.sendExtensionMessage("handlePageContext", pageContext, category);
        }

        function parseDOM(selector) {
            return $(selector);
        }

        function getPageContext() {
            return pageContext;
        }

        function openUrlNewTab(url) {
            if (!window.Xrm || !window.Xrm.Navigation || !window.Xrm.Navigation.openUrl) {
                window.open(url, "_blank");
            }
            else {
                Xrm.Navigation.openUrl(url);
            }

            EMC.App.Global.displayNotification(true);
        }

        async function initializeSolutions() {
            const fetchXml = `
                <fetch>
                    <entity name="solution">
                        <attribute name="solutionid" />
                        <attribute name="friendlyname" />
                        <order attribute="friendlyname" descending="false" />
                        <filter type="or">
                            <condition attribute="ismanaged" operator="eq" value="0" />
                        </filter>
                    </entity>
                </fetch>`;

            const query = `?fetchXml=${fetchXml}`;
            const response = await Xrm.WebApi.retrieveMultipleRecords("solution", query);
            if (!response || !response.entities || response.entities.length === 0) {
                EMC.App.Global.displayNotification(false, "No solutions found");
                return;
            }

            EMC.App.Global.sendExtensionMessage("handleSolutions", response.entities, category);
        }

        function parseUrlQueryParameters(queryParameter) {
            const queryParamRegex = new RegExp(`(?:&|\\?)${queryParameter}=([^&]+)`);
            const match = window.location.search.match(queryParamRegex);

            let queryParameterValue = null;
            if (match && match.length > 1) {
                queryParameterValue = match[1];
            } else {
                return null;
            }

            return queryParameterValue;
        }

        function getPluralName(logicalName) {
            if (!logicalName) {
                return logicalName;
            }
            if (logicalName.endsWith("s")) {
                return `${logicalName}es`;
            }
            if (logicalName.endsWith("y")) {
                return `${logicalName.slice(0, -1)}ies`;
            }
            return `${logicalName}s`;
        }

        return {
            sendExtensionMessage: sendExtensionMessage,
            displayNotification: displayNotification,
            initializePageContext: initializePageContext,
            parseDOM: parseDOM,
            getPageContext: getPageContext,
            openUrlNewTab: openUrlNewTab,
            initializeSolutions: initializeSolutions,
            parseUrlQueryParameters: parseUrlQueryParameters,
            getPluralName: getPluralName,
        };
    })();
})(this);
