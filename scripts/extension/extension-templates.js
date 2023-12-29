(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.Templates = (function () {
        const category = "Templates";

        const $jsonEditorSelector = "#template-json-editor";
        const $templateSelectSelector = "#template-file-selector";
        const $templateNameInput = "#input-template-name";
        let jsonEditor = null;

        let currentTemplateId;

        function executeOnLoad() {
            attachHandlers();

            initializeJSONEditor();
            retrieveSavedTemplates();
        }

        function attachHandlers() {
            $("#templates-content button[data-function-name]:not([data-has-parameters])").click(function () {
                EMC.Extension.Global.executeChromeScript($(this).attr("data-function-name"), category);
            });

            $("#templates-content button[data-extension-function-name]").click(function () {
                EMC.Extension.Templates[$(this).attr("data-extension-function-name")]();
            });

            $("#import-template-file").change(importNewTemplate);

            $($templateSelectSelector).change(loadSelectedTemplate);
        }

        function loadNewTemplate(json) {
            startDraftForm(null, json);
        }

        function applyCurrentTemplate() {
            const json = jsonEditor.get();
            if (!json || Object.keys(json).length === 0) {
                EMC.Extension.Global.displayNotification({ success: false, text: "No template found to apply" });
                return;
            }

            EMC.Extension.Global.executeChromeScript("populateFieldsFromTemplate", category, json);
        }

        async function saveCurrentTemplate() {
            EMC.Extension.Global.showLoadingIndicator(true);

            const templateName = $($templateNameInput).val();
            if (templateName === "") {
                EMC.Extension.Global.displayNotification({ success: false, text: "Please populate the Template Name" });
                EMC.Extension.Global.showLoadingIndicator(false);
                return;
            }

            const templateJson = generateTemplateJSON();
            const jsonGuid = currentTemplateId !== null ? currentTemplateId : EMC.Extension.Global.generateGuid();

            const localStorageValue = {};
            const storageKey = formatStorageKey(jsonGuid);
            localStorageValue[storageKey] = templateJson;

            const response = await EMC.Extension.Global.upsertSetting(localStorageValue);
            if (!response || !response.success) {
                EMC.Extension.Global.displayNotification(response);
                EMC.Extension.Global.showLoadingIndicator(false);
                return;
            }

            currentTemplateId = jsonGuid;
            EMC.Extension.Global.displayNotification({ success: true, text: `Successfully saved template: ${templateName}` });
            EMC.Extension.Global.showLoadingIndicator(false);

            refreshTemplateForm();
        }

        async function deleteCurrentTemplate() {
            if (!currentTemplateId) {
                EMC.Extension.Global.displayNotification({ success: false, text: "No template selected" });
                return;
            }

            const storageKey = formatStorageKey(currentTemplateId);
            const templateJson = await EMC.Extension.Global.retrieveSetting(storageKey);

            const confirm = await EMC.Extension.Global.confirmAction(
                `Please confirm that you would like to delete the template "${templateJson.templateName}" `
            );

            if (!confirm) {
                return;
            }

            const response = await EMC.Extension.Global.deleteSetting(storageKey);
            if (!response || !response.success) {
                EMC.Extension.Global.displayNotification(response);
                return;
            }

            EMC.Extension.Global.displayNotification({ success: true, text: `Successfully deleted template` });
            currentTemplateId = null;
            refreshTemplateForm();
        }

        function exportCurrentTemplate() {
            const templateJson = generateTemplateJSON();
            if (!templateJson || !templateJson.fields || Object.keys(templateJson.fields).length === 0) {
                EMC.Extension.Global.displayNotification({ success: false, text: "No template found to export" });
                return;
            }

            const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(templateJson));
            let $exportTemplateAnchor = $("#export-template-anchor");
            $exportTemplateAnchor.attr({
                href: jsonString,
                download: `Model-Driven App Template - ${templateJson.templateName}.json`,
            });
            $exportTemplateAnchor[0].click();
        }

        function importTemplate() {
            $("#import-template-file").click();
        }

        function importNewTemplate() {
            const file = this.files[0];

            const reader = new FileReader();
            reader.onload = onReaderLoad;
            reader.readAsText(file);
        }

        function onReaderLoad(event) {
            const templateJson = JSON.parse(event.target.result);

            startDraftForm(templateJson.templateName, templateJson.fields);
        }

        async function loadSelectedTemplate() {
            const $selector = $(this);
            currentTemplateId = $selector.val();

            const storageKey = formatStorageKey(currentTemplateId);
            const templateJson = await EMC.Extension.Global.retrieveSetting(storageKey);

            setJSONTemplateName(templateJson.templateName);
            setJSONEditor(templateJson.fields);
        }

        function initializeJSONEditor() {
            const container = $($jsonEditorSelector)[0];
            const options = {
                sortObjectKeys: true,
            };
            jsonEditor = new JSONEditor(container, options);
        }

        function generateTemplateJSON(templateName = null, fieldsJson = null) {
            const name = templateName === null ? $($templateNameInput).val() : templateName;
            const fields = fieldsJson === null ? jsonEditor.get() : fieldsJson;

            return {
                templateName: name,
                fields: fields,
            };
        }

        async function retrieveSavedTemplates() {
            const pageContext = EMC.Extension.Global.getPageContext();
            const templates = await EMC.Extension.Global.retrieveSetting(null, `${category}.${pageContext}`);

            let options = Object.keys(templates).map((key) => {
                const templateId = parseStorageKey(key);
                return {
                    value: templateId,
                    text: templates[key].templateName,
                };
            });

            options.sort((a, b) => {
                return a.text.localeCompare(b.text);
            });

            $.each(options, function (index, option) {
                $($templateSelectSelector).append(
                    $("<option>", {
                        value: option.value,
                        text: option.text,
                    })
                );
            });
        }

        function startDraftForm(templateName, fields) {
            currentTemplateId = null;

            if ($(`${$templateSelectSelector} option[value="1"]`).length === 0) {
                $($templateSelectSelector).append(
                    $("<option>", {
                        value: 1,
                        text: "Create New Template...",
                    })
                );
            }

            $($templateSelectSelector).val(1);

            setJSONTemplateName(templateName);
            setJSONEditor(fields);
        }

        async function refreshTemplateForm() {
            $($templateSelectSelector).each(function () {
                $(this).find("option:not(:first)").remove();
            });

            await retrieveSavedTemplates();

            if (!currentTemplateId) {
                $(`${$templateSelectSelector} option:first`).prop("selected", true);
                showJSONEditor(false);
                return;
            }

            $($templateSelectSelector).val(currentTemplateId);
        }

        function setJSONTemplateName(templateName) {
            $($templateNameInput).val(templateName);
        }

        function setJSONEditor(json) {
            jsonEditor.set(json);
            showJSONEditor(true);
        }

        function showJSONEditor(show) {
            show ? $(".template-preview-container").show() : $(".template-preview-container").hide();
        }

        function formatStorageKey(templateId) {
            const pageContext = EMC.Extension.Global.getPageContext();
            return `${category}.${pageContext}.${templateId}`;
        }

        function parseStorageKey(storageKey) {
            const pageContext = EMC.Extension.Global.getPageContext();
            return storageKey.split(`${category}.${pageContext}.`)[1];
        }

        return {
            executeOnLoad: executeOnLoad,
            loadNewTemplate: loadNewTemplate,
            applyCurrentTemplate: applyCurrentTemplate,
            saveCurrentTemplate: saveCurrentTemplate,
            deleteCurrentTemplate: deleteCurrentTemplate,
            exportCurrentTemplate: exportCurrentTemplate,
            importTemplate: importTemplate,
        };
    })();
})(this);
