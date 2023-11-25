(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.Global = (function () {
        const ODataFormattedValueKeys = {
            DisplayValue: "@OData.Community.Display.V1.FormattedValue",
            LogicalName: "@Microsoft.Dynamics.CRM.lookuplogicalname",
        };

        const KeyCodes = {
            Tab: 9,
            Enter: 13
        };

        let activeTabId = null;

        const toastIconSuccessComponent = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16">
                <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
            </svg>`;

        const toastIconFailureComponent = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
            </svg>`;

        async function executeOnLoad() {
            attachHandlers();

            await initializeTabId();
            initializeListener();
        }

        function attachHandlers() {
            $(".offcanvas a:not(.dropdown-toggle)").click(function () {
                $(".offcanvas").offcanvas("hide");
            });
        }

        async function initializeTabId() {
            const results = await chrome.tabs.query({ currentWindow: true, active: true });
            activeTabId = results[0].id;
        }

        function initializeListener() {
            chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
                showLoadingIndicator(false);
                window["EMC"]["Extension"][request.category][request.command](request.data);
            });
        }

        function executeChromeScript(command, category, additionalArgs = null, showIndicator = true) {
            showLoadingIndicator(showIndicator);

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
            $(".toast-header-message").text(response.success ? "Action Successful" : "Action Failed");
            $(".toast-body-message").text(response.text);
            $("#toast-notification").removeClass("bg-success bg-danger");
            $("#toast-notification").addClass(response.success ? "bg-success" : "bg-danger");
            $(".toast-header-icon svg").remove();
            $(".toast-header-icon").append(response.success ? toastIconSuccessComponent : toastIconFailureComponent);
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
            KeyCodes: KeyCodes,
            executeChromeScript: executeChromeScript,
            generateGuid: generateGuid,
            getEntitySetName: getEntitySetName,
            showLoadingIndicator: showLoadingIndicator,
            displayNotification: displayNotification,
        };
    })();
})(this);
