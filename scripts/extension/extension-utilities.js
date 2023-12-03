(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.Utilities = (function () {
        const category = "Utilities";
        let currentQueries = {};
        let currentUrls = {};

        let selectedQuery = null;
        let selectedUrl = null;
        let appBaseUrl = null;

        const $fetchXmlSelector = "#fetch-xml-selector";
        const $urlSelector = "#url-selector";

        function executeOnLoad() {
            attachHandlers();
        }

        function attachHandlers() {
            $("#utilities-content button[data-function-name]").click(function () {
                EMC.Extension.Global.executeChromeScript($(this).attr("data-function-name"), category);
            });

            $("[data-category='utilities'] button[data-extension-function-name]").click(function () {
                EMC.Extension.Utilities[$(this).attr("data-extension-function-name")]();
            });

            $(`${$fetchXmlSelector}`).change(loadSelectedQuery);
            $(`${$urlSelector}`).change(loadSelectedUrl);
            $(".url-modal-form-manual-entry input").on("input", updateRecordUrlInput);
        }

        function loadSelectedQuery() {
            const $selector = $(this);
            const queryId = $selector.val();
            const query = currentQueries[queryId];

            selectedQuery = query;
            const highlightedCode = hljs.highlight(query, { language: "xml" }).value;
            $(".fetch-xml-modal-body-content").html(highlightedCode);
        }

        function handleFetchXmlResult(queries) {
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

            selectedUrl = currentUrls[urlId]
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
            EMC.Extension.Global.executeChromeScript("openUrlNewTab", category, selectedUrl);
        }

        return {
            executeOnLoad: executeOnLoad,
            handleFetchXmlResult: handleFetchXmlResult,
            handleGenerateUrlsResult: handleGenerateUrlsResult,
            copyContentToClipboard: copyContentToClipboard,
            sendContentToWebAPI: sendContentToWebAPI,
            copyUrlToClipboard: copyUrlToClipboard,
            navigateToUrl: navigateToUrl,
        };
    })();
})(this);
