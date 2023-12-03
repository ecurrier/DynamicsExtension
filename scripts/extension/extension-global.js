(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.Global = (function () {
        const category = "Global";
        let pageContext = null;

        const ODataFormattedValueKeys = {
            DisplayValue: "@OData.Community.Display.V1.FormattedValue",
            LogicalName: "@Microsoft.Dynamics.CRM.lookuplogicalname",
        };

        const KeyCodes = {
            Tab: 9,
            Enter: 13,
        };

        let activeTabId = null;

        const toastIconSuccessComponent = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#007800" class="bi bi-check-lg" viewBox="0 0 16 16">
                <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022"/>
            </svg>`;

        const toastIconFailureComponent = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#a20000" class="bi bi-exclamation-circle" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
            </svg>`;

        async function executeOnLoad() {
            attachHandlers();

            await initializeTabId();
            initializeListener();
            initializePageContext();
            initializeTooltips();
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

        function initializePageContext() {
            executeChromeScript("initializePageContext", category, null, false);
        }

        function initializeTooltips() {
            const tooltipTriggerList = [].slice.call($('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }

        function handlePageContext(context) {
            pageContext = context;

            EMC.Extension.Utilities.executeOnLoad();
            EMC.Extension.Templates.executeOnLoad();
            EMC.Extension.WebAPI.executeOnLoad();
            EMC.Extension.Security.executeOnLoad();
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
            if (!response || !response.text) {
                return;
            }

            $(".toast-body-message").text(response.text);
            $("#toast-notification").removeClass("bg-success bg-danger");
            $("#toast-notification").addClass(response.success ? "bg-success" : "bg-danger");
            $(".toast-icon svg").remove();
            $(".toast-icon").append(response.success ? toastIconSuccessComponent : toastIconFailureComponent);
            $("#toast-notification").toast("show");
        }

        function confirmAction(handler, content, htmlContent = false) {
            htmlContent ? $(".confirmation-modal-body-label").html(content) : $(".confirmation-modal-body-label").text(content);
            $("#confirmation-modal button.btn-primary").off("click").on("click", handler);
            $("#confirmation-modal").modal("show");
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

        function getPageContext() {
            return pageContext;
        }

        return {
            executeOnLoad: executeOnLoad,
            ODataFormattedValueKeys: ODataFormattedValueKeys,
            KeyCodes: KeyCodes,
            executeChromeScript: executeChromeScript,
            handlePageContext: handlePageContext,
            generateGuid: generateGuid,
            getEntitySetName: getEntitySetName,
            showLoadingIndicator: showLoadingIndicator,
            displayNotification: displayNotification,
            getPageContext: getPageContext,
            confirmAction: confirmAction,
        };
    })();
})(this);
