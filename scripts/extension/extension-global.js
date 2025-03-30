(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.Global = (function () {
        const category = "Global";
        let pageContext = null;
        let globalSolutions = null;
        let defaultEnvironmentDetails = null;

        const ODataFormattedValueKeys = {
            DisplayValue: "@OData.Community.Display.V1.FormattedValue",
            LogicalName: "@Microsoft.Dynamics.CRM.lookuplogicalname",
        };

        const KeyCodes = {
            Tab: 9,
            Enter: 13,
        };

        const MakerPortalUrls = {
            Default: "https://make.powerapps.com/",
            Commercial: "https://make.powerapps.com/",
            GCC: "https://make.gov.powerapps.us/",
            GCCHigh: "https://make.high.powerapps.us/",
            DOD: "https://make.apps.appsplatform.us/",
        };

        const AdminCenterUrls = {
            Default: "https://admin.powerplatform.microsoft.com/",
            Commercial: "https://admin.powerplatform.microsoft.com/",
            GCC: "https://gcc.admin.powerplatform.microsoft.us/",
            GCCHigh: "https://high.admin.powerplatform.microsoft.us/",
            DOD: "https://admin.appsplatform.us/",
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

        const solutionSelectSelector = "#solution-selector";
        const environmentSelectSelector = "#environment-selector";

        const defaultLoadingMessage = "Loading...";

        async function executeOnLoad() {
            attachHandlers();

            await initializeTabId();
            initializeListener();
            initializePageContext();
            initializeEnvironmentDetails();
            initializeSolutions();
            refreshTooltips('[data-bs-toggle="tooltip"]');
        }

        function attachHandlers() {
            $(".offcanvas a:not(.dropdown-toggle)").click(function () {
                $(".offcanvas").offcanvas("hide");
            });

            $("[data-bs-toggle='pill'][data-bs-target]").click(function () {
                const navLandmarkPath = $(this).attr("data-nav-landmark-path");
                const navLandmarkTooltip = $(this).attr("data-nav-landmark-tooltip");

                updateNavigationLandmark(navLandmarkPath, navLandmarkTooltip);

                const targetTab = $(this).attr("data-bs-target");
                saveLastVisitedPage(targetTab);
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

        function initializeEnvironmentDetails() {
            const parameters = {
                callbackFunction: "handleEnvironmentDetails",
                category: category,
            };

            EMC.Extension.Global.executeChromeScript("retrieveEnvironmentDetails", "Settings", parameters, false);
        }

        function handleEnvironmentDetails(environmentDetails) {
            EMC.Extension.Utilities.initializeEnvironmentDetailsModal(environmentDetails);

            environmentDetails.environmentName = "Current Environment";
            defaultEnvironmentDetails = environmentDetails;
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

            initializeSolutionSelector();
        }

        async function selectSolution(description = null) {
            $(".solution-selector-modal-body-label").toggle(!!description);
            if (description) {
                $(".solution-selector-modal-body-label").text(description);
            }

            return new Promise(function (resolve, reject) {
                const $modal = $("#solution-selector-modal");
                const $confirmButton = $("#solution-selector-confirm");
                const $cancelButton = $("#solution-selector-cancel");

                $confirmButton.off("click").on("click", () => {
                    const selectedSolutionId = $(solutionSelectSelector).val();
                    resolve(selectedSolutionId);
                });

                $cancelButton.off("click").on("click", () => {
                    resolve(null);
                });

                $modal.modal("show");
            });
        }

        function initializeSolutionSelector() {
            $.each(globalSolutions, function (index, globalSolution) {
                $(solutionSelectSelector).append(
                    $("<option>", {
                        value: globalSolution.id,
                        text: globalSolution.name,
                    })
                );
            });
        }

        function getSolutions(solutionId = null, solutionName = null) {
            if (!solutionId && !solutionName) {
                return globalSolutions;
            }

            const solution = globalSolutions.find((s) => s.id === solutionId || s.name === solutionName);
            return solution || null;
        }

        async function selectEnvironment() {
            initializeEnvironmentSelector();

            return new Promise(function (resolve, reject) {
                const $modal = $("#environment-selector-modal");
                const $confirmButton = $("#environment-selector-confirm");
                const $cancelButton = $("#environment-selector-cancel");

                $confirmButton.off("click").on("click", () => {
                    const selectedOption = $(`${environmentSelectSelector} option:selected`);
                    const selectedEnvironment = {
                        environmentId: selectedOption.attr("data-environment-id"),
                        environmentType: selectedOption.attr("data-environment-type"),
                    };
                    resolve(selectedEnvironment);
                });

                $cancelButton.off("click").on("click", () => {
                    resolve(null);
                });

                $modal.modal("show");
            });
        }

        function initializeEnvironmentSelector() {
            clearEnvironmentSelector();

            const storedEnvironments = EMC.Extension.Settings.getStoredEnvironments(true);
            $.each(storedEnvironments, function (index, storedEnvironment) {
                if (!storedEnvironment.environmentId) {
                    return;
                }

                $(environmentSelectSelector).append(
                    $(`<option>`, {
                        value: index + 1,
                        text: storedEnvironment.environmentName,
                    }).attr({
                        "data-environment-id": storedEnvironment.environmentId,
                        "data-environment-type": storedEnvironment.environmentType,
                    })
                );
            });
        }

        function clearEnvironmentSelector() {
            $(`${environmentSelectSelector} option:not(:first)`).remove();
            $(`${environmentSelectSelector} option:first`).prop("selected", true);
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
            try {
                await chrome.storage.local.set(setting);
                return { success: true };
            } catch (error) {
                return { success: false, message: error?.message };
            }
        }

        async function retrieveSetting(setting = null, filter = null) {
            try {
                const localStorage = await chrome.storage.local.get();

                if (filter) {
                    return Object.keys(localStorage)
                        .filter((key) => key.startsWith(filter))
                        .reduce((obj, key) => {
                            obj[key] = localStorage[key];
                            return obj;
                        }, {});
                }

                return !setting ? localStorage : localStorage[setting];
            } catch (error) {
                console.error(`Error retrieving setting: ${error}`);
            }
        }

        async function deleteSetting(storageKey) {
            await chrome.storage.local.remove([`${storageKey}`]);

            const error = chrome.runtime.lastError;
            if (!error) {
                return { success: true };
            }

            return { success: false, message: `Error occurred deleting setting: ${error}` };
        }

        function formatStorageKey(settingsKey, guid) {
            return `${settingsKey}.${guid}`;
        }

        function parseStorageKey(storageKey, settingsKey) {
            return storageKey.split(`${settingsKey}.`)[1];
        }

        function executeChromeScript(command, category, additionalArgs = null, showIndicator = true, indicatorMessage = null) {
            showLoadingIndicator(showIndicator, indicatorMessage);

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

        function showLoadingIndicator(display = true, message = null) {
            display ? $("#progress-indicator").addClass("visible") : $("#progress-indicator").removeClass("visible");
            message ? $("#progress-indicator-message").text(message) : $("#progress-indicator-message").text(defaultLoadingMessage);
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

        async function confirmAction(content, htmlContent = false) {
            $("#confirmation-modal-label").text("Confirmation");
            htmlContent ? $(".confirmation-modal-body-label").html(content) : $(".confirmation-modal-body-label").text(content);
            $("#confirmation-modal-confirm").show();

            return new Promise(function (resolve, reject) {
                const $modal = $("#confirmation-modal");
                const $confirmButton = $("#confirmation-modal button.btn-primary");
                const $cancelButton = $("#confirmation-modal button.btn-secondary");

                $confirmButton.off("click").on("click", () => {
                    resolve(true);
                });

                $cancelButton.off("click").on("click", () => {
                    resolve(false);
                });

                $modal.modal("show");
            });
        }

        function displayDetailedError(label, content, htmlContent = false, handler = null) {
            $("#confirmation-modal-label").text(label);
            htmlContent ? $(".confirmation-modal-body-label").html(content) : $(".confirmation-modal-body-label").text(content);
            $("#confirmation-modal button.btn-primary").off("click").on("click", handler);
            $("#confirmation-modal-confirm").hide();
            $("#confirmation-modal").modal("show");
        }

        async function confirmInputAction(content, htmlContent = false) {
            $("#input-confirmation-modal-label").text("Input Required");
            htmlContent ? $(".input-confirmation-modal-body-label").html(content) : $(".input-confirmation-modal-body-label").text(content);
            $("#input-confirmation-modal-confirm").show();

            return new Promise(function (resolve, reject) {
                const $modal = $("#input-confirmation-modal");
                const $confirmButton = $("#input-confirmation-modal button.btn-primary");
                const $cancelButton = $("#input-confirmation-modal button.btn-secondary");

                $confirmButton.off("click").on("click", () => {
                    const input = $("#input-confirmation-modal #input-confirmation-modal-input").val();
                    if (!input) {
                        return;
                    }

                    $modal.modal("hide");
                    resolve(input);
                });

                $cancelButton.off("click").on("click", () => {
                    resolve(false);
                });

                $modal.modal("show");
            });
        }

        function updateNavigationLandmark(path, tooltip) {
            $(".nav-landmark-path").text(path);
            $(".nav-landmark-tooltip").attr("title", tooltip);
            refreshTooltips(".nav-landmark-tooltip");
        }

        function saveLastVisitedPage(targetTab) {
            upsertSetting({
                "Extension.OpenLastVisitedPage.Target": targetTab,
            });
        }

        async function openDefaultTab() {
            const $defaultTab = $("[data-bs-target='#utilities-admin-content']");

            const isEnabled = EMC.Extension.Settings.getExtensionSettings({ Parent: "Extension", Group: "OpenLastVisitedPage", Key: "Enabled" });
            if (!isEnabled) {
                $defaultTab.click();
                return;
            }

            const targetId = await retrieveSetting("Extension.OpenLastVisitedPage.Target");
            const $targetTab = targetId ? $(`[data-bs-target='${targetId}']`) : $defaultTab;

            $targetTab.click();
            new bootstrap.Tab($targetTab).show();
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

        function getDefaultEnvironmentDetails() {
            return defaultEnvironmentDetails;
        }

        async function getActiveTabUrl(baseUrlOnly = false) {
            try {
                const activeTabs = await chrome.tabs.query({ active: true });
                if (!activeTabs || activeTabs.length === 0) {
                    return null;
                }

                const activeTabUrl = activeTabs[0].url;

                if (baseUrlOnly) {
                    const baseUrlMatch = activeTabUrl.match(/^(https?:\/\/[^\/]+\/)/);
                    return baseUrlMatch ? baseUrlMatch[1] : null;
                }

                return activeTabUrl;
            } catch (error) {
                EMC.Extension.Global.displayNotification({ success: false, text: `Error occurred retrieving current url: ${error}` });
                return null;
            }
        }

        return {
            executeOnLoad: executeOnLoad,
            ODataFormattedValueKeys: ODataFormattedValueKeys,
            KeyCodes: KeyCodes,
            MakerPortalUrls: MakerPortalUrls,
            AdminCenterUrls: AdminCenterUrls,
            executeChromeScript: executeChromeScript,
            handlePageContext: handlePageContext,
            handleEnvironmentDetails: handleEnvironmentDetails,
            handleSolutions: handleSolutions,
            upsertSetting: upsertSetting,
            retrieveSetting: retrieveSetting,
            deleteSetting: deleteSetting,
            formatStorageKey: formatStorageKey,
            parseStorageKey: parseStorageKey,
            generateGuid: generateGuid,
            getPluralName: getPluralName,
            getActiveTabUrl: getActiveTabUrl,
            showLoadingIndicator: showLoadingIndicator,
            displayNotification: displayNotification,
            getPageContext: getPageContext,
            getDefaultEnvironmentDetails: getDefaultEnvironmentDetails,
            getSolutions: getSolutions,
            selectSolution: selectSolution,
            selectEnvironment: selectEnvironment,
            confirmAction: confirmAction,
            confirmInputAction: confirmInputAction,
            displayDetailedError: displayDetailedError,
            openDefaultTab: openDefaultTab,
        };
    })();
})(this);
