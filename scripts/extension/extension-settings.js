(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.Settings = (function () {
        const category = "Settings";
        const environmentsSettingsKey = "Settings.environments";
        let storedEnvironments = {};
        let currentEnvironmentId = null;

        const inputsContainerSelector = ".settings-environments-inputs-container";
        const environmentSelectSelector = "#settings-environment-selector";

        function executeOnLoad() {
            attachHandlers();
            refreshEnvironmentForm();
        }

        function attachHandlers() {
            $("[data-category='settings'] button[data-function-name]:not([data-has-parameters])").click(function () {
                EMC.Extension.Global.executeChromeScript($(this).attr("data-function-name"), category);
            });

            $("[data-category='settings'] button[data-extension-function-name]").click(function () {
                EMC.Extension.Settings[$(this).attr("data-extension-function-name")](this);
            });

            $(environmentSelectSelector).change(loadSelectedEnvironment);
        }

        async function retrieveStoredEnvironments() {
            storedEnvironments = await EMC.Extension.Global.retrieveSetting(null, environmentsSettingsKey);
        }

        function getStoredEnvironments() {
            return storedEnvironments;
        }

        function addNewEnvironment() {
            currentEnvironmentId = null;

            if ($(`${environmentSelectSelector} option[value="1"]`).length === 0) {
                $(environmentSelectSelector).append(
                    $("<option>", {
                        value: 1,
                        text: "Create New Environment...",
                    })
                );
            }

            $(environmentSelectSelector).val(1);
            $(inputsContainerSelector).show();
        }

        async function saveCurrentEnvironment() {
            const environmentGuid = currentEnvironmentId !== null ? currentEnvironmentId : EMC.Extension.Global.generateGuid();

            const syncStorageValue = {};
            const settingsKey = EMC.Extension.Global.formatStorageKey(environmentsSettingsKey, environmentGuid);
            const environmentSettings = formatEnvironmentSettingsObject();
            if (!environmentSettings) {
                return;
            }

            syncStorageValue[settingsKey] = environmentSettings;
            await EMC.Extension.Global.upsertSetting(syncStorageValue);
            currentEnvironmentId = environmentGuid;

            refreshEnvironmentForm();
        }

        async function removeCurrentEnvironment() {
            if (!currentEnvironmentId) {
                EMC.Extension.Global.displayNotification({ success: false, text: "No environment selected" });
                return;
            }

            const settingsKey = EMC.Extension.Global.formatStorageKey(environmentsSettingsKey, currentEnvironmentId);
            const environment = await EMC.Extension.Global.retrieveSetting(settingsKey);

            EMC.Extension.Global.confirmAction(function () {
                chrome.storage.sync.remove([`${settingsKey}`], function () {
                    const error = chrome.runtime.lastError;
                    if (error) {
                        EMC.Extension.Global.displayNotification({ success: false, text: `Error occurred removing environment: ${error}` });
                        return;
                    }

                    EMC.Extension.Global.displayNotification({ success: true, text: `Successfully removed environment` });
                    currentEnvironmentId = null;
                    refreshEnvironmentForm();
                });
            }, `Please confirm that you would like to remove the environment "${environment.environmentName}" `);
        }

        async function loadSelectedEnvironment() {
            const $selector = $(this);
            currentEnvironmentId = $selector.val();

            refreshEnvironmentInputs();
        }

        function formatEnvironmentSettingsObject() {
            const environmentName = $("#settings-environment-name-input").val();
            if (!environmentName) {
                EMC.Extension.Global.displayNotification({ success: false, text: "Please populate an environment name" });
                return null;
            }

            const mdaUrl = $("#settings-environment-mda-url-input").val();
            const makerUrl = $("#settings-environment-maker-url-input").val();
            const portalUrl = $("#settings-environment-portal-url-input").val();

            return {
                environmentName: environmentName,
                mdaUrl: mdaUrl,
                makerUrl: makerUrl,
                portalUrl: portalUrl,
            };
        }

        async function refreshEnvironmentForm() {
            await retrieveStoredEnvironments();
            refreshEnvironmentSelector();
            refreshEnvironmentInputs();
        }

        function refreshEnvironmentSelector() {
            $(environmentSelectSelector).each(function () {
                $(this).find("option:not(:first)").remove();
            });

            let options = Object.keys(storedEnvironments).map((key) => {
                const environmentId = EMC.Extension.Global.parseStorageKey(key, environmentsSettingsKey);
                return {
                    value: environmentId,
                    text: storedEnvironments[key].environmentName,
                };
            });

            options.sort((a, b) => {
                return a.text.localeCompare(b.text);
            });

            $.each(options, function (index, option) {
                $(environmentSelectSelector).append(
                    $("<option>", {
                        value: option.value,
                        text: option.text,
                    })
                );
            });

            if (!currentEnvironmentId) {
                $(`${environmentSelectSelector} option:first`).prop("selected", true);
                return;
            }

            $(environmentSelectSelector).val(currentEnvironmentId);
        }

        async function refreshEnvironmentInputs() {
            if (!currentEnvironmentId) {
                $("#settings-environment-name-input").val(null);
                $("#settings-environment-mda-url-input").val(null);
                $("#settings-environment-maker-url-input").val(null);
                $("#settings-environment-portal-url-input").val(null);
                
                $(inputsContainerSelector).hide();
                return;
            }

            const settingsKey = EMC.Extension.Global.formatStorageKey(environmentsSettingsKey, currentEnvironmentId);
            const environment = await EMC.Extension.Global.retrieveSetting(settingsKey);

            $("#settings-environment-name-input").val(environment.environmentName);
            $("#settings-environment-mda-url-input").val(environment.mdaUrl);
            $("#settings-environment-maker-url-input").val(environment.makerUrl);
            $("#settings-environment-portal-url-input").val(environment.portalUrl);

            $(inputsContainerSelector).show();
        }

        function openUrlNewTab(e) {
            const $button = $(e);
            const selectedUrl = $button.siblings("input").val();

            EMC.Extension.Global.executeChromeScript("openUrlNewTab", "Global", selectedUrl);
        }

        return {
            executeOnLoad: executeOnLoad,
            getStoredEnvironments: getStoredEnvironments,
            addNewEnvironment: addNewEnvironment,
            saveCurrentEnvironment: saveCurrentEnvironment,
            removeCurrentEnvironment: removeCurrentEnvironment,
            openUrlNewTab: openUrlNewTab,
        };
    })();
})(this);
