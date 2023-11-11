(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.WebAPI = (function () {
        const category = "WebAPI";
        let fieldAttributeMetadata = null;
        let tableAttributeMetadata = null;
        let picklistMetadata = null;
        let booleanMetadata = null;

        const $attributeMetadataSelector = "#attribute-metadata-selector";

        function executeOnLoad() {
            registerHandlers();
        }

        function registerHandlers() {
            $("#webapi-content button[data-function-name]:not([data-has-parameters])").click(function () {
                EMC.Extension.Global.executeChromeScript($(this).attr("data-function-name"), category);
            });

            $("#webapi-content button[data-function-name='updateField']").click(sendUpdateRequest);

            $($attributeMetadataSelector).change(initializeUpdateFieldForm);
            $("#update-field-null").change(disableForm);
        }

        function populateAttributeMetadata(attributeMetadataCollection) {
            $(`${$attributeMetadataSelector} option:not(:first)`).remove();
            $($attributeMetadataSelector).prop("disabled", true);
            tableAttributeMetadata = attributeMetadataCollection[0];
            picklistMetadata = attributeMetadataCollection[1];
            booleanMetadata = attributeMetadataCollection[2];

            $.each(tableAttributeMetadata, function (index, attributeMetadata) {
                $($attributeMetadataSelector).append(
                    $("<option>", {
                        value: attributeMetadata.LogicalName,
                        text: attributeMetadata.LogicalName,
                        "data-attribute-type": attributeMetadata.AttributeType,
                    })
                );
            });

            $($attributeMetadataSelector).prop("disabled", false);
        }

        function initializeUpdateFieldForm() {
            resetFormFields();

            const fieldLogicalName = this.value;
            const filteredArray = tableAttributeMetadata.filter(function (object) {
                return object.LogicalName === fieldLogicalName;
            });

            if (filteredArray.length === 0) {
                return;
            }

            fieldAttributeMetadata = filteredArray[0];

            loadFormFields();
        }

        function resetFormFields() {
            $("#update-field-inputs-container").hide();
            $("#update-field-inputs-container .field-input").hide();

            $(`#update-field-inputs-container input`).val("");
            $(`#update-field-inputs-container textarea`).val("");
            $(".form-check-input").prop("checked", false);
            $(`#update-field-inputs-container select`).each(function () {
                $(this).find("option:not(:first)").remove();
                $(this).prop("disabled", false);
            });
        }

        function loadFormFields() {
            $("#field-display-name").text(fieldAttributeMetadata?.DisplayName?.UserLocalizedLabel?.Label);
            $("#field-logical-name").text(fieldAttributeMetadata.LogicalName);
            $("#field-attribute-type").text(fieldAttributeMetadata.AttributeType);

            switch (fieldAttributeMetadata.AttributeType) {
                case "Money":
                case "Integer":
                case "BigInt":
                case "Double":
                    $(".field-input-number").show();
                    break;
                case "String":
                    $("label[for='update-field-text-singleline']").text("Enter a value");
                    $(".field-input-text-singleline").show();
                    break;
                case "DateTime":
                    $("label[for='update-field-text-singleline']").text("Enter a datestring (YYYY-mm-dd)");
                    $(".field-input-text-singleline").show();
                    break;
                case "Memo":
                    $(".field-input-text-multiline").show();
                    break;
                case "Lookup":
                case "Owner":
                case "Customer":
                    initializeTableOptionSet(fieldAttributeMetadata.Targets);
                    $("label[for='update-field-text-singleline']").text("Enter a guid");
                    $(".field-input-text-singleline").show();
                    $(".field-input-select-entity").show();
                    break;
                case "Picklist":
                case "Boolean":
                case "State":
                case "Status":
                    initializeChoiceOptionSet(fieldAttributeMetadata.LogicalName, fieldAttributeMetadata.AttributeType);
                    $(".field-input-select-choice").show();
                    break;
            }

            $("#update-field-inputs-container").show();
        }

        function initializeTableOptionSet(tableLogicalNames) {
            if (tableLogicalNames.length === 0) {
                return;
            }

            var options = tableLogicalNames.map(function (tableLogicalName) {
                return {
                    value: tableLogicalName,
                    text: tableLogicalName,
                };
            });

            populateSelectOptions("#update-field-select-entity", options);
        }

        function initializeChoiceOptionSet(fieldLogicalName, attributeType) {
            let metadata = null;
            switch (attributeType) {
                case "Boolean":
                    metadata = booleanMetadata;
                    break;
                case "Picklist":
                case "State":
                case "Status":
                    metadata = picklistMetadata;
                    break;
                default:
                    return;
            }

            const filteredMetadata = metadata.find((object) => object.LogicalName === fieldLogicalName);
            if (!filteredMetadata) {
                return;
            }

            let options = [];
            if (attributeType === "Boolean") {
                options = [
                    { value: filteredMetadata.OptionSet.FalseOption.Value, text: filteredMetadata.OptionSet.FalseOption.Label.UserLocalizedLabel.Label },
                    { value: filteredMetadata.OptionSet.TrueOption.Value, text: filteredMetadata.OptionSet.TrueOption.Label.UserLocalizedLabel.Label },
                ];
            } else if (attributeType === "Picklist" || attributeType === "State" || attributeType === "Status") {
                options = filteredMetadata.OptionSet.Options.map((option) => ({
                    value: option.Value,
                    text: option.Label.UserLocalizedLabel.Label,
                }));
            }

            populateSelectOptions("#update-field-select-choice", options);
        }

        function populateSelectOptions($selector, options) {
            $.each(options, function (index, option) {
                $($selector).append(
                    $("<option>", {
                        value: option.value,
                        text: option.text,
                    })
                );
            });

            if (options.length === 1) {
                $($selector).val(options[0].value);
                $($selector).prop("disabled", true);
            }
        }

        function disableForm() {
            const disabled = $(this).prop("checked");
            $(".field-input select").prop("disabled", disabled);
            $(".field-input input").prop("disabled", disabled);
            $(".field-input textarea").prop("disabled", disabled);
        }

        function sendUpdateRequest() {
            const fieldLogicalName = fieldAttributeMetadata.LogicalName;
            let payload = {};

            const clearField = $("#update-field-null").prop("checked");

            switch (fieldAttributeMetadata.AttributeType) {
                case "Money":
                case "Integer":
                case "BigInt":
                case "Double":
                    const numberValue = $(".field-input-number input").val();
                    payload[fieldLogicalName] = clearField ? "null" : numberValue;
                    break;
                case "String":
                    const stringValue = $(".field-input-text-singleline input").val();
                    payload[fieldLogicalName] = clearField ? "null" : stringValue;
                    break;
                case "DateTime":
                    break;
                case "Memo":
                    const multilineValue = $(".field-input-text-multiline textarea").val();
                    payload[fieldLogicalName] = clearField ? "null" : multilineValue;
                    break;
                case "Lookup":
                case "Owner":
                case "Customer":
                    const selectEntityValue = $(".field-input-select-entity select").val();
                    const guidValue = $(".field-input-text-singleline input").val();
                    const entityTarget = fieldAttributeMetadata.Targets.length > 1 ? `_${selectEntityValue}` : null;
                    payload[`${clearField ? `_${fieldLogicalName}_value` : `${fieldLogicalName}${entityTarget}@odata.bind`}`] = clearField
                        ? "null"
                        : `/${EMC.Extension.Global.getEntitySetName(selectEntityValue)}(${guidValue})`;
                    break;
                case "Picklist":
                case "Boolean":
                case "State":
                case "Status":
                    const selectChoiceValue = $(".field-input-select-choice select").val();
                    payload[fieldLogicalName] = clearField ? "null" : selectChoiceValue;
                    break;
            }

            EMC.Extension.Global.executeChromeScript($(this).attr("data-function-name"), category, payload);
        }

        return {
            executeOnLoad: executeOnLoad,
            populateAttributeMetadata: populateAttributeMetadata,
        };
    })();
})(this);
