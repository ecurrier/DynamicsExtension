(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.Utilities = (function () {
        const category = "Utilities";
        let generatedFetchXml = null;

        function executeOnLoad() {
            registerHandlers();
        }

        function registerHandlers() {
            $("#utilities-content button[data-function-name]").click(function () {
                EMC.Extension.Global.executeChromeScript($(this).attr("data-function-name"), category);
            });

            $("[data-category='utilities'] button[data-extension-function-name]").click(function () {
                EMC.Extension.Utilities[$(this).attr("data-extension-function-name")]();
            });
        }

        function handleFetchXmlResult(fetchXml) {
            const formattedXml = formatXml(fetchXml);
            generatedFetchXml = formattedXml;

            const highlightedCode = hljs.highlight(formattedXml, { language: "xml" }).value;
            $(".fetch-xml-modal-body").html(highlightedCode);
            $("#fetch-xml-modal").modal("show");
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
            navigator.clipboard.writeText(generatedFetchXml);
            EMC.Extension.Global.displayNotification({ success: true, text: "Copied Fetch XML to clipboard" });
        }

        function sendContentToWebAPI() {
            $("#fetchxml-textarea").val(generatedFetchXml);
            $("#fetch-xml-modal").modal("hide");
            $('[data-bs-target="#webapi-retrieve-records-content"]').tab("show");
            $('[data-bs-target="#webapi-retrieve-records-content"]').click();
            $("#accordion-container-fetchxml-editor").collapse('show');
        }

        return {
            executeOnLoad: executeOnLoad,
            handleFetchXmlResult: handleFetchXmlResult,
            copyContentToClipboard: copyContentToClipboard,
            sendContentToWebAPI: sendContentToWebAPI,
        };
    })();
})(this);
