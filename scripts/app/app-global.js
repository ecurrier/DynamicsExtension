(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.App = global.EMC.App || {};
    global.EMC.App.Global = (function () {
        const category = "Global";

        function sendExtensionMessage(command, data, namespace = category) {
            chrome.runtime.sendMessage(document.getElementById("extension-id").value, {
                category: namespace,
                command: command,
                data: data,
            });
        }

        function parseDOM(selector) {
            return $(selector);
        }

        return {
            sendExtensionMessage: sendExtensionMessage,
            parseDOM: parseDOM,
        };
    })();
})(this);
