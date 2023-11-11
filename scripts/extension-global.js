(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.Global = (function () {
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

        function dispatchMessage(command, category, additionalArgs) {
            window.postMessage({ command: command, category: category, additionalArgs: additionalArgs }, "*");
        }

        function showLoadingIndicator(display = true) {
            display ? $('.loading-container').show() : $('.loading-container').hide();
        }

        function displayNotification(response) {
            
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
            executeChromeScript: executeChromeScript,
            getEntitySetName: getEntitySetName,
            showLoadingIndicator: showLoadingIndicator,
        };
    })();
})(this);
