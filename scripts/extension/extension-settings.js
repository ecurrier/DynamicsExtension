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

        function getStoredEnvironments() {
            return Object.values(storedEnvironments);
        }

        async function addNewEnvironment() {
            currentEnvironmentId = null;

            await refreshEnvironmentForm();

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
            EMC.Extension.Global.displayNotification({ success: true, text: "Successfully saved environment settings" });
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

            const environmentType = $("#settings-environment-type-selector").val();
            const mdaUrl = $("#settings-environment-mda-url-input").val();
            const portalUrl = $("#settings-environment-portal-url-input").val();
            const environmentId = $("#settings-environment-id-input").val();

            return {
                environmentName: environmentName,
                environmentType: environmentType,
                mdaUrl: mdaUrl,
                portalUrl: portalUrl,
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
                $("#settings-environment-name-input").val(null);
                $("#settings-environment-mda-url-input").val(null);
                $("#settings-environment-type-selector option:first").prop("selected", true);
                $("#settings-environment-portal-url-input").val(null);
                $("#settings-environment-id-input").val(null);

                $(inputsContainerSelector).hide();
                return;
            }

            const settingsKey = EMC.Extension.Global.formatStorageKey(environmentsSettingsKey, currentEnvironmentId);
            const environment = await EMC.Extension.Global.retrieveSetting(settingsKey);

            $("#settings-environment-name-input").val(environment.environmentName);
            $("#settings-environment-mda-url-input").val(environment.mdaUrl);
            $("#settings-environment-type-selector").val(environment.environmentType);
            $("#settings-environment-portal-url-input").val(environment.portalUrl);
            $("#settings-environment-id-input").val(environment.environmentId);

            $(inputsContainerSelector).show();
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
            saveCurrentEnvironment: saveCurrentEnvironment,
            removeCurrentEnvironment: removeCurrentEnvironment,
            openUrlNewTab: openUrlNewTab,
            getExtensionSettings: getExtensionSettings,
            refreshExtensionSettings: refreshExtensionSettings,
        };
    })();
})(this);
