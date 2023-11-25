(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.Utilities = (function () {
        const category = "Utilities";

        function executeOnLoad() {
            registerHandlers();
        }

        function registerHandlers() {
            $("#utilities-content button[data-function-name]").click(function() {
                EMC.Extension.Global.executeChromeScript(
                    $(this).attr('data-function-name'),
                    category
                );
            });
        }

        return {
            executeOnLoad: executeOnLoad,
        };
    })();
})(this);
