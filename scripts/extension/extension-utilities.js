(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.Utilities = (function () {
        const category = "Utilities";
        let currentQueries = {};
        let currentUrls = {};
        let currentChoiceCodeSnippets = {};

        let selectedQuery = null;
        let selectedUrl = null;
        let appBaseUrl = null;
        let selectedChoiceCodeSnippet = null;
        let selectedFormXml = null;

        const $fetchXmlSelector = "#fetch-xml-selector";
        const $urlSelector = "#url-selector";
        const $choiceCodeSnippetSelector = "#choice-code-snippet-selector";
        const $choiceCodeLanguageSelector = "#choice-code-language-selector";

        function executeOnLoad() {
            attachHandlers();
        }

        function attachHandlers() {
            $("[data-category='utilities'] button[data-function-name]").click(function () {
                EMC.Extension.Global.executeChromeScript($(this).attr("data-function-name"), category, null, true, $(this).attr("data-loading-message"));
            });

            $("[data-category='utilities'] button[data-extension-function-name]").click(function () {
                EMC.Extension.Utilities[$(this).attr("data-extension-function-name")]();
            });

            $(`${$fetchXmlSelector}`).change(loadSelectedQuery);
            $("#fetch-xml-double-quote").change(reformatQueries);

            $(`${$urlSelector}`).change(loadSelectedUrl);
            $(`${$choiceCodeSnippetSelector}`).change(loadSelectedChoiceCodeSnippet);
            $(`${$choiceCodeLanguageSelector}`).change(loadSelectedChoiceCodeSnippet);
            $(".url-modal-form-manual-entry input").on("input", updateRecordUrlInput);
        }

        function loadSelectedQuery() {
            const $selector = !this ? $(`${$fetchXmlSelector}`) : $(this);
            const queryId = $selector.val();
            const query = currentQueries[queryId];

            selectedQuery = query;
            const highlightedCode = hljs.highlight(query, { language: "xml" }).value;
            $(".fetch-xml-modal-body-content").html(highlightedCode);
        }

        function handleFetchXmlResult(queries) {
            if (!queries) {
                EMC.Extension.Global.displayNotification({ success: false, text: "Unable to retrieve any queries" });
                return;
            }

            resetQuerySelector();
            appendQueries(queries);
            $("#fetch-xml-modal").modal("show");
        }

        function resetQuerySelector() {
            currentQueries = {};
            selectedQuery = null;
            $(`${$fetchXmlSelector} option:not(:first)`).remove();
            $(`${$fetchXmlSelector} option:first`).prop("selected", true);
            $(".fetch-xml-modal-body-content").children().remove();
        }

        function appendQueries(queries) {
            queries.forEach((q) => {
                appendQueryOption(q);
            });
        }

        function appendQueryOption(query) {
            const formattedXml = formatXml(query.fetchXml);

            const queryId = EMC.Extension.Global.generateGuid();
            currentQueries[queryId] = formattedXml;

            $($fetchXmlSelector).append(
                $("<option>", {
                    value: queryId,
                    text: query.name,
                })
            );
        }

        function reformatQueries() {
            const useDoubleQuotes = $(this).prop("checked");
            currentQueries = replaceQuotesInObject(currentQueries, useDoubleQuotes);

            loadSelectedQuery();
        }

        function replaceQuotesInObject(obj, useDouble) {
            const updatedEntries = Object.entries(obj).map(([key, value]) => {
                let updatedValue;

                if (useDouble) {
                    updatedValue = value.replace(/'/g, '"');
                } else {
                    updatedValue = value.replace(/"/g, "'");
                }

                return [key, updatedValue];
            });

            return Object.fromEntries(updatedEntries);
        }

        function loadSelectedUrl() {
            clearUrlModalInputs();
            const $selector = $(this);
            const urlId = $selector.val();
            if (!urlId) {
                $("#url-modal button.btn-submit").prop("disabled", true);
                return;
            }

            $("#url-modal button.btn-submit").prop("disabled", false);
            $(".url-modal-form-link").removeClass("hidden");

            if (urlId === "1") {
                $(".url-modal-form-manual-entry").removeClass("hidden");
                $(".url-modal-form-link input").val(`${appBaseUrl}&pagetype=entityrecord&etn=&id=`);
                return;
            }

            $(".url-modal-form-manual-entry").addClass("hidden");

            selectedUrl = currentUrls[urlId];
            $(".url-modal-form-link input").val(selectedUrl);
        }

        function updateRecordUrlInput() {
            const recordLogicalName = $("#record-url-logical-name").val();
            const recordId = $("#record-url-id").val();

            const formattedUrl = `${appBaseUrl}&pagetype=entityrecord&etn=${recordLogicalName}&id=${recordId}`;
            selectedUrl = formattedUrl;

            $(".url-modal-form-link input").val(formattedUrl);
        }

        function handleGenerateUrlsResult(urls) {
            resetUrlSelector();
            appendUrls(urls.Urls);
            appBaseUrl = urls.AppUrl;
            $("#url-modal").modal("show");
        }

        function resetUrlSelector() {
            currentUrls = {};
            selectedUrl = null;
            appBaseUrl = null;
            $(`${$urlSelector} option:nth-child(n+2):not(:nth-last-child(-n+1))`).remove();
            $(`${$urlSelector} option:first`).prop("selected", true);
            clearUrlModalInputs();
            $(".url-modal-form-link a").text(null);
            $("#url-modal button.btn-submit").prop("disabled", true);
        }

        function clearUrlModalInputs() {
            $(".url-modal-form input").val(null);
        }

        function appendUrls(urls) {
            urls.slice()
                .reverse()
                .forEach((q) => {
                    appendUrlOption(q);
                });
        }

        function appendUrlOption(url) {
            const urlId = EMC.Extension.Global.generateGuid();
            currentUrls[urlId] = url.url;

            $(`${$urlSelector} option:first`).after(
                $("<option>", {
                    value: urlId,
                    text: url.name,
                })
            );
        }

        function formatXml(xml) {
            var formatted = "";
            var reg = /(>)(<)(\/*)/g;
            xml = xml.replace(reg, "$1\r\n$2$3");
            var pad = 0;
            jQuery.each(xml.split("\r\n"), function (index, node) {
                var indent = 0;
                if (node.match(/.+<\/\w[^>]*>$/)) {
                    indent = 0;
                } else if (node.match(/^<\/\w/)) {
                    if (pad != 0) {
                        pad -= 1;
                    }
                } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
                    indent = 1;
                } else {
                    indent = 0;
                }

                var padding = "";
                for (var i = 0; i < pad; i++) {
                    padding += "  ";
                }

                formatted += padding + node + "\r\n";
                pad += indent;
            });

            return formatted;
        }

        function copyContentToClipboard() {
            navigator.clipboard.writeText(selectedQuery);
            EMC.Extension.Global.displayNotification({ success: true, text: "Copied Fetch XML to clipboard" });
        }

        function sendContentToWebAPI() {
            $("#fetchxml-textarea").val(selectedQuery);
            $("#fetch-xml-modal").modal("hide");
            $('[data-bs-target="#webapi-retrieve-records-content"]').tab("show");
            $('[data-bs-target="#webapi-retrieve-records-content"]').click();
            $("#accordion-container-fetchxml-editor").collapse("show");
        }

        function copyUrlToClipboard() {
            navigator.clipboard.writeText(selectedUrl);
            EMC.Extension.Global.displayNotification({ success: true, text: "Copied URL/Link to clipboard" });
        }

        function navigateToUrl() {
            EMC.Extension.Global.executeChromeScript("openUrlNewTab", "Global", selectedUrl);
        }

        function loadSelectedChoiceCodeSnippet() {
            const choiceId = $(`${$choiceCodeSnippetSelector}`).val(),
                language = $(`${$choiceCodeLanguageSelector}`).val();
            if (!choiceId || !language) {
                return;
            }

            const choice = currentChoiceCodeSnippets[choiceId];
            const choiceCode = generateChoiceCode(choice, language);

            selectedChoiceCodeSnippet = choiceCode;
            const highlightedCode = hljs.highlight(choiceCode, { language: language }).value;
            $(".choice-code-snippet-modal-body-content").html(highlightedCode);
        }

        function generateChoiceCode(choice, language) {
            switch (language) {
                case "csharp":
                    let csharp = `public enum ${sanitizeContent(choice.name?.trim(), "")}\n{\n`;
                    choice.options.forEach((o) => {
                        csharp = `${csharp}\t${sanitizeContent(o?.Label?.LocalizedLabels[0]?.Label?.trim(), "_")} = ${o?.Value},\n`;
                    });
                    csharp = `${csharp}}`;
                    return csharp;
                case "javascript":
                    let javascript = `const ${EMC.Extension.Global.getPluralName(sanitizeContent(choice.name?.trim(), ""))} = {\n`;
                    choice.options.forEach((o) => {
                        javascript = `${javascript}\t${sanitizeContent(o?.Label?.LocalizedLabels[0]?.Label?.trim(), "")}: ${o?.Value},\n`;
                    });
                    javascript = `${javascript}};`;
                    return javascript;
                default:
                    return;
            }
        }

        function sanitizeContent(content, replacer = null) {
            const specialCharacterPattern = /[&\/\\#,+()$~%.'":*?<>{}-]/g;

            const sanitizedContent = content.replace(specialCharacterPattern, "");
            return replacer !== null ? replaceWhitespaces(sanitizedContent, replacer) : sanitizedContent;
        }

        function replaceWhitespaces(content, replacer) {
            const whitespacePattern = /\s+/g;

            return content.replace(whitespacePattern, replacer);
        }

        function handleChoiceCodeSnippetsResult(choices) {
            resetChoiceCodeSnippetSelector();
            appendChoiceCodeSnippets(choices);
            $("#choice-code-snippet-modal").modal("show");
        }

        function resetChoiceCodeSnippetSelector() {
            currentChoiceCodeSnippets = {};
            selectedChoiceCodeSnippet = null;
            $(`${$choiceCodeSnippetSelector} option:not(:first)`).remove();
            $(`${$choiceCodeSnippetSelector} option:first`).prop("selected", true);
            $(`${$choiceCodeLanguageSelector} option:first`).prop("selected", true);
            $(".choice-code-snippet-modal-body-content").children().remove();
            $(".choice-code-snippet-modal-body-content").text(null);
        }

        function appendChoiceCodeSnippets(choices) {
            choices.GlobalOptionSetMetadata.forEach((c) => {
                appendChoiceCodeSnippet(c, "global");
            });
            choices?.BooleanMetadata?.forEach((c) => {
                appendChoiceCodeSnippet(c, choices.EntityName);
            });
            choices?.PicklistMetadata?.forEach((c) => {
                appendChoiceCodeSnippet(c, choices.EntityName);
            });
        }

        function appendChoiceCodeSnippet(choice, descriptor) {
            const choiceId = EMC.Extension.Global.generateGuid();
            currentChoiceCodeSnippets[choiceId] = choice;

            $(`${$choiceCodeSnippetSelector} option:first`).after(
                $("<option>", {
                    value: choiceId,
                    text: `${choice.name} (${descriptor})`,
                })
            );
        }

        function copyChoiceCodeSnippetToClipboard() {
            navigator.clipboard.writeText(selectedChoiceCodeSnippet);
            EMC.Extension.Global.displayNotification({ success: true, text: "Copied Code to clipboard" });
        }

        async function openMakerPortal() {
            const environments = EMC.Extension.Settings.getStoredEnvironments();

            const defaultEnvironment = EMC.Extension.Settings.getExtensionSettings({ Parent: category, Group: "OpenMakerUrl", Key: "DefaultEnvironment" });
            if (defaultEnvironment || !environments || environments.length === 0) {
                const defaultEnvironmentDetails = EMC.Extension.Global.getDefaultEnvironmentDetails();
                openMakerPortalUrl(defaultEnvironmentDetails.environmentType, defaultEnvironmentDetails.environmentId);
                return;
            }

            const selectedEnvironment = await EMC.Extension.Global.selectEnvironment();
            if (!selectedEnvironment) {
                return;
            }

            openMakerPortalUrl(selectedEnvironment.environmentType, selectedEnvironment.environmentId);
        }

        function openMakerPortalUrl(environmentType, environmentId = null) {
            const baseUrl = EMC.Extension.Global.MakerPortalUrls[environmentType] || EMC.Extension.Global.MakerPortalUrls.Default;
            const fullUrl = environmentId ? `${baseUrl}environments/${environmentId}` : baseUrl;

            EMC.Extension.Global.executeChromeScript("openUrlNewTab", "Global", fullUrl, false);
        }

        function openControlEditor() {
            EMC.Extension.Global.executeChromeScript("retrieveControlDetails", category, { handler: "handleControlDetails" });
        }

        async function handleControlDetails(controlDetails) {
            const defaultEnvironmentDetails = EMC.Extension.Global.getDefaultEnvironmentDetails();

            const useDefaultSolution = EMC.Extension.Settings.getExtensionSettings({ Parent: category, Group: "OpenControlEditor", Key: "UseDefaultSolution" });
            const solutionId = !useDefaultSolution
                ? await EMC.Extension.Global.selectSolution("Select a solution to open the control editor in")
                : EMC.Extension.Global.getSolutions(null, "Default Solution").id;
            if (!solutionId) {
                return;
            }

            const baseUrl = EMC.Extension.Global.MakerPortalUrls[defaultEnvironmentDetails.environmentType] || EMC.Extension.Global.MakerPortalUrls.Default;
            const fullUrl = `${baseUrl}e/${defaultEnvironmentDetails.environmentId}/s/${solutionId}/entity/${controlDetails.entityName}/${controlDetails.controlType}/${controlDetails.id}`;

            EMC.Extension.Global.executeChromeScript("openUrlNewTab", "Global", fullUrl);
        }

        async function openAdminCenter() {
            const environments = EMC.Extension.Settings.getStoredEnvironments();

            const defaultEnvironment = EMC.Extension.Settings.getExtensionSettings({ Parent: category, Group: "OpenAdminCenter", Key: "DefaultEnvironment" });
            if (defaultEnvironment || !environments || environments.length === 0) {
                const defaultEnvironmentDetails = EMC.Extension.Global.getDefaultEnvironmentDetails();
                openAdminCenterUrl(defaultEnvironmentDetails.environmentType, defaultEnvironmentDetails.environmentId);
                return;
            }

            const selectedEnvironment = await EMC.Extension.Global.selectEnvironment();
            if (!selectedEnvironment) {
                return;
            }

            openAdminCenterUrl(selectedEnvironment.environmentType, selectedEnvironment.environmentId);
        }

        function openAdminCenterUrl(environmentType, environmentId = null) {
            const baseUrl = EMC.Extension.Global.AdminCenterUrls[environmentType] || EMC.Extension.Global.AdminCenterUrls.Default;
            const fullUrl = environmentId ? `${baseUrl}environments/environment/${environmentId}/hub` : baseUrl;

            EMC.Extension.Global.executeChromeScript("openUrlNewTab", "Global", fullUrl, false);
        }

        function initializeEnvironmentDetailsModal(environmentDetails) {
            const formattedEnvironmentDetails = formatEnvironmentDetails(environmentDetails);
            $(".environment-details-modal-body").append(formattedEnvironmentDetails);
        }

        function formatEnvironmentDetails(environmentDetails) {
            const detailsList = $("<ul></ul>");

            Object.entries(environmentDetails).forEach(([key, value]) => {
                const formattedKey = key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase())
                    .trim()
                    .replace(" ", " ");
                const formattedValue = value || "&mdash;";
                detailsList.append(`<li>${formattedKey}: ${formattedValue}</li>`);
            });

            return detailsList;
        }

        function displayEnvironmentDetails() {
            $("#environment-details-modal").modal("show");
        }

        function openFormXmlViewer() {
            EMC.Extension.Global.executeChromeScript("retrieveControlDetails", category, { handler: "openFormXmlViewerModal", controlToCheck: "form" });
        }

        function openFormXmlViewerModal(controlDetails) {
            const formattedXml = formatXml(controlDetails.xml);
            selectedFormXml = formattedXml;

            const highlightedCode = hljs.highlight(formattedXml, { language: "xml" }).value;
            $(".form-xml-editor-modal-body-content").html(highlightedCode);
            $("#form-xml-editor-modal").modal("show");
        }

        function copyFormXmlSnippetToClipboard() {
            navigator.clipboard.writeText(selectedFormXml);
            EMC.Extension.Global.displayNotification({ success: true, text: "Copied Form XML to clipboard" });
        }

        return {
            executeOnLoad: executeOnLoad,
            handleFetchXmlResult: handleFetchXmlResult,
            handleGenerateUrlsResult: handleGenerateUrlsResult,
            copyContentToClipboard: copyContentToClipboard,
            sendContentToWebAPI: sendContentToWebAPI,
            copyUrlToClipboard: copyUrlToClipboard,
            navigateToUrl: navigateToUrl,
            handleChoiceCodeSnippetsResult: handleChoiceCodeSnippetsResult,
            copyChoiceCodeSnippetToClipboard: copyChoiceCodeSnippetToClipboard,
            openMakerPortal: openMakerPortal,
            openControlEditor: openControlEditor,
            handleControlDetails: handleControlDetails,
            openAdminCenter: openAdminCenter,
            initializeEnvironmentDetailsModal: initializeEnvironmentDetailsModal,
            displayEnvironmentDetails: displayEnvironmentDetails,
            openFormXmlViewer: openFormXmlViewer,
            openFormXmlViewerModal: openFormXmlViewerModal,
            copyFormXmlSnippetToClipboard: copyFormXmlSnippetToClipboard,
        };
    })();
})(this);
