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
            if (Xrm && Xrm.Navigation && Xrm.Navigation.openUrl) {
                Xrm.Navigation.openUrl(url);
            }
            else {
                window.open(url, "_blank");
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

        return {
            sendExtensionMessage: sendExtensionMessage,
            displayNotification: displayNotification,
            initializePageContext: initializePageContext,
            parseDOM: parseDOM,
            getPageContext: getPageContext,
            openUrlNewTab: openUrlNewTab,
            initializeSolutions: initializeSolutions,
        };
    })();
})(this);
