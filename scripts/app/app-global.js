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
            Xrm.Navigation.openUrl(url);

            EMC.App.Global.displayNotification(true);
        }

        return {
            sendExtensionMessage: sendExtensionMessage,
            displayNotification: displayNotification,
            initializePageContext: initializePageContext,
            parseDOM: parseDOM,
            getPageContext: getPageContext,
            openUrlNewTab: openUrlNewTab,
        };
    })();
})(this);
