(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.Settings = (function () {
        const category = "Settings";
        const environmentsSettingsKey = "Settings.environments";
        const extensionSettingsKey = "Settings.extension";

        let storedEnvironments = {};
        let currentEnvironmentId = null;

        let globalExtensionSettings = null;

        const inputsContainerSelector = ".settings-environments-inputs-container";
        const environmentSelectSelector = "#settings-environment-selector";
        const extensionSettingsContentSelector = "#settings-extension-settings-content";

        async function executeOnLoad() {
            attachHandlers();
            refreshEnvironmentForm();
            await loadExtensionSettings();
            initializeExtensionSettingsForm();
        }

        function attachHandlers() {
            $("[data-category='settings'] button[data-function-name]:not([data-has-parameters])").click(function () {
                EMC.Extension.Global.executeChromeScript($(this).attr("data-function-name"), category);
            });

            $("[data-category='settings'] button[data-extension-function-name]").click(function () {
                EMC.Extension.Settings[$(this).attr("data-extension-function-name")](this);
            });

            $(environmentSelectSelector).change(loadSelectedEnvironment);

            $(`${extensionSettingsContentSelector} input[type="checkbox"]`).change(function () {
                refreshExtensionSettings();
            });
        }

        async function retrieveStoredEnvironments() {
            storedEnvironments = await EMC.Extension.Global.retrieveSetting(null, environmentsSettingsKey);
        }

        function getStoredEnvironments(includeDefault = false) {
            const defaultEnvironmentDetails = EMC.Extension.Global.getDefaultEnvironmentDetails();
            if (!includeDefault || !defaultEnvironmentDetails) {
                return Object.values(storedEnvironments);
            }

            return [defaultEnvironmentDetails, ...Object.values(storedEnvironments)];
        }

        function addNewEnvironment() {
            const parameters = {
                callbackFunction: "handleEnvironmentDetails",
                category: category,
            };

            EMC.Extension.Global.executeChromeScript("retrieveEnvironmentDetails", category, parameters, true, "Retrieving Environment Details...");
        }

        async function handleEnvironmentDetails(environmentDetails) {
            currentEnvironmentId = null;

            await refreshEnvironmentForm();
            loadEnvironmentDetailsForm(environmentDetails);

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

            const localStorageValue = {};
            const settingsKey = EMC.Extension.Global.formatStorageKey(environmentsSettingsKey, environmentGuid);
            const environmentSettings = formatEnvironmentSettingsObject();
            if (!environmentSettings) {
                return;
            }

            localStorageValue[settingsKey] = environmentSettings;
            await EMC.Extension.Global.upsertSetting(localStorageValue);
            currentEnvironmentId = environmentGuid;

            refreshEnvironmentForm();
            EMC.Extension.Global.displayNotification({ success: true, text: "Successfully saved environment settings" });
        }

        async function removeCurrentEnvironment() {
            if (!currentEnvironmentId) {
                EMC.Extension.Global.displayNotification({ success: false, text: "No environment selected" });
                return;
            }

            const settingsKey = EMC.Extension.Global.formatStorageKey(environmentsSettingsKey, currentEnvironmentId);
            const environment = await EMC.Extension.Global.retrieveSetting(settingsKey);

            const confirm = await EMC.Extension.Global.confirmAction(
                `Please confirm that you would like to remove the environment "${environment.environmentName}" `
            );

            if (!confirm) {
                return;
            }

            const response = await EMC.Extension.Global.deleteSetting(settingsKey);
            if (!response || !response.success) {
                EMC.Extension.Global.displayNotification(response);
                return;
            }

            EMC.Extension.Global.displayNotification({ success: true, text: `Successfully removed environment` });
            currentEnvironmentId = null;
            refreshEnvironmentForm();
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

            const environmentType = $("#settings-environment-type-selector").val();
            const modelDrivenAppUrl = $("#settings-environment-mda-url-input").val();
            const powerPagesUrl = $("#settings-environment-portal-url-input").val();
            const environmentId = $("#settings-environment-id-input").val();

            return {
                environmentName: environmentName,
                environmentType: environmentType,
                modelDrivenAppUrl: modelDrivenAppUrl,
                powerPagesUrl: powerPagesUrl,
                environmentId: environmentId,
            };
        }

        async function refreshEnvironmentForm() {
            await retrieveStoredEnvironments();
            refreshEnvironmentSelector();
            await refreshEnvironmentInputs();
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
                loadEnvironmentDetailsForm(null);
                $(inputsContainerSelector).hide();
                return;
            }

            const settingsKey = EMC.Extension.Global.formatStorageKey(environmentsSettingsKey, currentEnvironmentId);
            const environmentDetails = await EMC.Extension.Global.retrieveSetting(settingsKey);

            loadEnvironmentDetailsForm(environmentDetails);
            $(inputsContainerSelector).show();
        }

        function loadEnvironmentDetailsForm(environmentDetails) {
            $("#settings-environment-name-input").val(environmentDetails?.environmentName);
            $("#settings-environment-mda-url-input").val(environmentDetails?.modelDrivenAppUrl);

            !environmentDetails?.environmentType
                ? $("#settings-environment-type-selector option:first").prop("selected", true)
                : $("#settings-environment-type-selector").val(environmentDetails?.environmentType);

            $("#settings-environment-portal-url-input").val(environmentDetails?.powerPagesUrl);
            $("#settings-environment-id-input").val(environmentDetails?.environmentId);
        }

        function openUrlNewTab(e) {
            const $button = $(e);
            const selectedUrl = $button.siblings("input").val();

            EMC.Extension.Global.executeChromeScript("openUrlNewTab", "Global", selectedUrl);
        }

        async function loadExtensionSettings() {
            const extensionSettings = await EMC.Extension.Global.retrieveSetting(extensionSettingsKey);
            if (!extensionSettings) {
                refreshExtensionSettings(true);
                return;
            }

            globalExtensionSettings = extensionSettings;

            EMC.Extension.Global.openDefaultTab();
        }

        function initializeExtensionSettingsForm() {
            const parents = Object.keys(globalExtensionSettings);
            parents.forEach((p) => {
                const groups = Object.keys(globalExtensionSettings[p]);
                groups.forEach((g) => {
                    const keys = Object.keys(globalExtensionSettings[p][g]);
                    keys.forEach((k) => {
                        $(`[data-setting-parent="${p}"] [data-setting-group="${g}"] [data-setting-key="${k}"]`).prop(
                            "checked",
                            globalExtensionSettings[p][g][k]
                        );
                    });
                });
            });
        }

        function buildSettingsObject(useDefault = false) {
            return $("[data-setting-parent]")
                .toArray()
                .reduce((obj, parent) => {
                    const parentKey = $(parent).attr("data-setting-parent");
                    obj[parentKey] = {};

                    $(parent)
                        .find("[data-setting-group]")
                        .each((index, group) => {
                            const groupKey = $(group).attr("data-setting-group");
                            obj[parentKey][groupKey] = {};

                            $(group)
                                .find("[data-setting-key]")
                                .each((index, key) => {
                                    const keyKey = $(key).attr("data-setting-key");
                                    const value = !useDefault ? $(key).prop("checked") : $(key).attr("data-setting-default") === "true";
                                    obj[parentKey][groupKey][keyKey] = value;
                                });
                        });

                    return obj;
                }, {});
        }

        function getExtensionSettings(setting = null) {
            if (!setting) {
                return globalExtensionSettings;
            }

            return globalExtensionSettings[setting.Parent][setting.Group][setting.Key];
        }

        function refreshExtensionSettings(useDefault = false) {
            const extensionSettings = buildSettingsObject(useDefault);

            const storageObject = {};
            storageObject[extensionSettingsKey] = extensionSettings;
            EMC.Extension.Global.upsertSetting(storageObject);

            globalExtensionSettings = extensionSettings;

            return extensionSettings;
        }

        return {
            executeOnLoad: executeOnLoad,
            getStoredEnvironments: getStoredEnvironments,
            addNewEnvironment: addNewEnvironment,
            handleEnvironmentDetails: handleEnvironmentDetails,
            saveCurrentEnvironment: saveCurrentEnvironment,
            removeCurrentEnvironment: removeCurrentEnvironment,
            openUrlNewTab: openUrlNewTab,
            getExtensionSettings: getExtensionSettings,
            refreshExtensionSettings: refreshExtensionSettings,
        };
    })();
})(this);
