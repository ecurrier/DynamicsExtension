(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.App = global.EMC.App || {};
    global.EMC.App.Utilities = (function () {
        const category = "Utilities";

        function refreshCommandBar() {
            Xrm.Page.ui.refreshRibbon();

            EMC.App.Global.sendExtensionMessage("displayNotification", { sucess: true, text: "Ribbon refreshed" });
        }

        return {
            refreshCommandBar: refreshCommandBar,
        };
    })();
})(this);
