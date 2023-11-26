(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.App = global.EMC.App || {};
    global.EMC.App.Templates = (function () {
        const category = "Templates";

        function generateNewTemplate() {
            let formJson = {};

            const pageContext = EMC.App.Global.getPageContext();
            switch (pageContext) {
                case EMC.App.Constants.PageContexts.ModelDrivenApp:
                    formJson = retrieveAppFormJSON();
                    break;
                case EMC.App.Constants.PageContexts.Portal:
                    formJson = retrievePortalFormJSON();
                    break;
                default:
                    return;
            }

            EMC.App.Global.sendExtensionMessage("loadNewTemplate", formJson, category);
        }

        function retrieveAppFormJSON() {
            let formJson = {};

            const formFields = Xrm.Page.data.entity.attributes;
            formFields.forEach((attribute, index) => {
                const attributeName = attribute.getName();
                const attributeValue = attribute.getValue();
                if (attributeValue === null) {
                    return;
                }

                formJson[attributeName] = attributeValue;
            });

            return formJson;
        }

        function retrievePortalFormJSON() {
            let formJson = {};

            const inputs = $(".crmEntityFormView .control > .form-control:not([type='hidden'])");
            $.each(inputs, function (index, input) {
                const attributeName = $(input).attr("id");
                const attributeValue = $(input).val() !== "" ? $(input).val() : null;
                if (attributeValue === null) {
                    return;
                }

                formJson[attributeName] = attributeValue;
            });

            return formJson;
        }

        function populateFieldsFromTemplate(json) {
            const pageContext = EMC.App.Global.getPageContext();
            switch (pageContext) {
                case EMC.App.Constants.PageContexts.ModelDrivenApp:
                    populateAppFormFromTemplate(json);
                    break;
                case EMC.App.Constants.PageContexts.Portal:
                    populatePortalFormFromTemplate(json);
                    break;
                default:
                    return;
            }

            EMC.App.Global.sendExtensionMessage("displayNotification", { success: true, text: "Successfully applied template" });
        }

        function populateAppFormFromTemplate(json) {
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
        }

        function populatePortalFormFromTemplate(json) {
            const keys = Object.keys(json);
            keys.forEach((key) => {
                try {
                    const $input = $(`#${key}`);
                    const value = json[key];

                    $input.val(value);
                } catch (error) {
                    console.error(error);
                }
            });
        }

        return {
            generateNewTemplate: generateNewTemplate,
            populateFieldsFromTemplate: populateFieldsFromTemplate,
        };
    })();
})(this);
