(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.Global = (function () {
        const category = "Global";
        let pageContext = null;
        let globalSolutions = null;

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
            initializeSolutions();
            refreshTooltips('[data-bs-toggle="tooltip"]');

            $("[data-bs-target='#utilities-admin-content']").click();
        }

        function attachHandlers() {
            $(".offcanvas a:not(.dropdown-toggle)").click(function () {
                $(".offcanvas").offcanvas("hide");
            });

            $("[data-bs-toggle='pill'][data-bs-target]").click(function () {
                const navLandmarkPath = $(this).attr("data-nav-landmark-path");
                const navLandmarkTooltip = $(this).attr("data-nav-landmark-tooltip");

                updateNavigationLandmark(navLandmarkPath, navLandmarkTooltip);
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

        function handlePageContext(context) {
            pageContext = context;

            EMC.Extension.Utilities.executeOnLoad();
            EMC.Extension.Templates.executeOnLoad();
            EMC.Extension.WebAPI.executeOnLoad();
            EMC.Extension.Security.executeOnLoad();
        }

        function initializeSolutions() {
            executeChromeScript("initializeSolutions", category, null, false);
        }

        function handleSolutions(solutions) {
            globalSolutions = solutions.map((s) => {
                return {
                    id: s.solutionid,
                    name: s.friendlyname,
                };
            });

            /* NEXT STEPS:
            
            FINISH FUNCTION TO RETRIEVE SOLUTIONS
            CREATE MODAL FOR SOLUTION SELECTOR
            ADD FAVORITE SOLUTION ID INPUT TO ENVIRONMENT SETTINGS?
            ADD EXTENSION SETTINGS TO ALLOW USER TO DEFAULT TO THEIR FAVORITE SOLUTION ID
                WHEN USING OPEN FORM/VIEW EDITOR

            ADD SETTING TO ENVIRONMENT SETTINGS TO ALLOW USERS TO MARK THEIR ENVIRONMENT AS GCC, GCC-HIGH, OR DOD
                THEN WE CAN REMOVE MAKER PORTAL URL AND REPLACE WITH ENVIRONMENT ID
            */
        }

        function getSolutions(solutionId = null) {
            if (!solutionId) {
                return globalSolutions;
            }

            const solution = globalSolutions.find((s) => s.id === solutionId);
            return solution || null;
        }

        function refreshTooltips(selector) {
            const options = {
                html: true,
            };

            const tooltipTriggerList = [].slice.call($(selector));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl, options);
            });
        }

        async function upsertSetting(setting) {
            chrome.storage.sync.set(setting);
        }

        async function retrieveSetting(setting = null, filter = null) {
            try {
                const syncStorage = await chrome.storage.sync.get();

                if (filter) {
                    return Object.keys(syncStorage)
                        .filter((key) => key.startsWith(filter))
                        .reduce((obj, key) => {
                            obj[key] = syncStorage[key];
                            return obj;
                        }, {});
                }

                return !setting ? syncStorage : syncStorage[setting];
            } catch (error) {
                console.error(`Error retrieving setting: ${error}`);
            }
        }

        function formatStorageKey(settingsKey, guid) {
            return `${settingsKey}.${guid}`;
        }

        function parseStorageKey(storageKey, settingsKey) {
            return storageKey.split(`${settingsKey}.`)[1];
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

        function updateNavigationLandmark(path, tooltip) {
            $(".nav-landmark-path").text(path);
            $(".nav-landmark-tooltip").attr("title", tooltip);
            refreshTooltips(".nav-landmark-tooltip");
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

        function getPageContext() {
            return pageContext;
        }

        return {
            executeOnLoad: executeOnLoad,
            ODataFormattedValueKeys: ODataFormattedValueKeys,
            KeyCodes: KeyCodes,
            executeChromeScript: executeChromeScript,
            handlePageContext: handlePageContext,
            handleSolutions: handleSolutions,
            upsertSetting: upsertSetting,
            retrieveSetting: retrieveSetting,
            formatStorageKey: formatStorageKey,
            parseStorageKey: parseStorageKey,
            generateGuid: generateGuid,
            getPluralName: getPluralName,
            showLoadingIndicator: showLoadingIndicator,
            displayNotification: displayNotification,
            getPageContext: getPageContext,
            getSolutions: getSolutions,
            confirmAction: confirmAction,
        };
    })();
})(this);
