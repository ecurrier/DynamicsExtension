(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.Global = (function () {
        const ODataFormattedValueKeys = {
            DisplayValue: "@OData.Community.Display.V1.FormattedValue",
            LogicalName: "@Microsoft.Dynamics.CRM.lookuplogicalname",
        };

        let activeTabId = null;

        function executeOnLoad() {
            initializeTabId();
            initializeListener();
        }

        function initializeTabId() {
            chrome.tabs.query({ currentWindow: true, active: true }, function (tabArray) {
                activeTabId = tabArray[0].id;
            });
        }

        function initializeListener() {
            chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
                showLoadingIndicator(false);
                window["EMC"]["Extension"][request.category][request.command](request.data);
            });
        }

        function executeChromeScript(command, category, additionalArgs = null) {
            showLoadingIndicator();

            chrome.scripting.executeScript({
                target: { tabId: activeTabId },
                func: dispatchMessage,
                args: [command, category, additionalArgs],
            });
        }

        function generateGuid() {
            return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
                (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
            );
        }

        function dispatchMessage(command, category, additionalArgs) {
            window.postMessage({ command: command, category: category, additionalArgs: additionalArgs }, "*");
        }

        function showLoadingIndicator(display = true) {
            display ? $(".loading-container").show() : $(".loading-container").hide();
        }

        function displayNotification(response) {
            $(".toast-header-message").text(response.success ? "Action Failed" : "Action Successful");
            $(".toast-body-message").text(response.text);
            $("#toast-notification").toast("show");
        }

        function getEntitySetName(logicalName) {
            if (!logicalName) {
                return logicalName;
            }
            if (logicalName.endsWith("s")) {
                return `${logicalName}es`;
            }
            if (logicalName.endsWith("y")) {
                return `${logicalName}ies`;
            }
            return `${logicalName}s`;
        }

        return {
            executeOnLoad: executeOnLoad,
            ODataFormattedValueKeys: ODataFormattedValueKeys,
            executeChromeScript: executeChromeScript,
            generateGuid: generateGuid,
            getEntitySetName: getEntitySetName,
            showLoadingIndicator: showLoadingIndicator,
            displayNotification: displayNotification,
        };
    })();
})(this);
