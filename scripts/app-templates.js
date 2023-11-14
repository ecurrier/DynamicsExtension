(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.App = global.EMC.App || {};
    global.EMC.App.Templates = (function () {
        const category = "Templates";

        function generateNewTemplate() {
            let formJson = {};

            const formFields = Xrm.Page.data.entity.attributes;
            formFields.forEach((attribute, index) => {
                const attributeName = attribute.getName();
                const attributeValue = attribute.getValue();

                formJson[attributeName] = attributeValue;
            });

            EMC.App.Global.sendExtensionMessage("loadNewTemplate", formJson, category);
        }

        function populateFieldsFromTemplate(json) {
            const keys = Object.keys(json);
            keys.forEach((key) => {
                try {
                    const attribute = Xrm.Page.getAttribute(key);
                    let value = json[key];

                    if (attribute.getAttributeType() === "datetime") {
                        value = new Date(value);
                    }

                    Xrm.Page.getAttribute(key).setValue(value);
                } catch (error) {
                    console.error(error);
                }
            });

            EMC.App.Global.sendExtensionMessage("displayNotification", { sucess: true, text: "Successfully applied template" });
        }

        return {
            generateNewTemplate: generateNewTemplate,
            populateFieldsFromTemplate: populateFieldsFromTemplate,
        };
    })();
})(this);
