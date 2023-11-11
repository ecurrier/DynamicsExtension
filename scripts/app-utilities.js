(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.App = global.EMC.App || {};
    global.EMC.App.Utilities = (function () {
        function refreshCommandBar() {
            //Xrm.Page.ui.refreshRibbon();
            // Add way to send repsonse back to extensions notifying of success/failure
            // wont be useful here, but will be useful for other functions
            chrome.runtime.sendMessage(document.getElementById('extension-id').value, {'data': 'whatever'});
        }

        return {
            refreshCommandBar: refreshCommandBar,
        };
    })();
})(this);
