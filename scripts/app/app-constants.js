(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.App = global.EMC.App || {};
    global.EMC.App.Constants = (function () {
        const WebApiEndpoint = "/api/data/v9.2/";

        const FormTypes = {
            Undefined: 0,
            Create: 1,
            Update: 2,
            ReadOnly: 3,
            Disabled: 4,
            BulkEdit: 6,
        };

        const PageContexts = {
            ModelDrivenApp: "model-driven-app",
            Portal: "portal",
        };

        return {
            WebApiEndpoint,
            FormTypes: FormTypes,
            PageContexts: PageContexts,
        };
    })();
})(this);
