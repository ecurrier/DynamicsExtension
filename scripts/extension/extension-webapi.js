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
        let recordValues = null;

        const $attributeMetadataSelector = "#attribute-metadata-selector";

        function executeOnLoad() {
            attachHandlers();
        }

        function attachHandlers() {
            $("[data-category='webapi'] button[data-function-name]:not([data-has-parameters])").click(function () {
                EMC.Extension.Global.executeChromeScript($(this).attr("data-function-name"), category);
            });

            $("[data-category='webapi'] button[data-extension-function-name]").click(function () {
                EMC.Extension.WebAPI[$(this).attr("data-extension-function-name")]();
            });

            $("[data-category='webapi'] button[data-function-name='updateField']").click(sendUpdateRequest);

            $($attributeMetadataSelector).change(initializeUpdateFieldForm);
            $("#update-field-null").change(disableForm);
            $("#fetchxml-textarea").on("keydown", handleSpecialKeyDown);
        }

        function populateAttributeMetadata(response) {
            tableAttributeMetadata = response.AttributeMetadata;
            picklistMetadata = response.PicklistMetadata;
            booleanMetadata = response.BooleanMetadata;
            recordValues = response.RecordValues;

            if (response.RefreshForm) {
                $($attributeMetadataSelector).trigger("change");
                return;
            }

            $(`${$attributeMetadataSelector} option:not(:first)`).remove();
            $($attributeMetadataSelector).prop("disabled", true);

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
            let fieldValue = retrieveRecordValue(fieldLogicalName, fieldAttributeMetadata);
            if (fieldValue == null) {
                fieldValue = "-";
            }

            loadFormFields(fieldValue);
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

            enableInputs();
        }

        function loadFormFields(fieldValue) {
            $("#field-display-name").text(fieldAttributeMetadata?.DisplayName?.UserLocalizedLabel?.Label);
            $("#field-logical-name").text(fieldAttributeMetadata.LogicalName);
            $("#field-attribute-type").text(fieldAttributeMetadata.AttributeType === "Virtual" ? "MultiSelectPicklist" : fieldAttributeMetadata.AttributeType);
            $("#field-attribute-value").text(fieldValue);

            switch (fieldAttributeMetadata.AttributeType) {
                case "Money":
                case "Integer":
                case "BigInt":
                case "Double":
                case "Decimal":
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
                case "Virtual":
                    initializeMultiselectChoiceOptionSet(fieldAttributeMetadata.LogicalName, fieldAttributeMetadata.AttributeType);
                    $(".field-input-multiselect-choice").show();
                    break;
                default:
                    return;
            }

            $("#update-field-inputs-container").show();
        }

        function initializeTableOptionSet(tableLogicalNames) {
            if (tableLogicalNames.length === 0) {
                return;
            }

            const options = tableLogicalNames.map(function (tableLogicalName) {
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

        function initializeMultiselectChoiceOptionSet(fieldLogicalName, attributeType) {
            const metadata = picklistMetadata;
            const filteredMetadata = metadata.find((object) => object.LogicalName === fieldLogicalName && object.AttributeType === attributeType);
            if (!filteredMetadata) {
                return;
            }

            const options = filteredMetadata.OptionSet.Options.map((option) => ({
                value: option.Value,
                text: option.Label.UserLocalizedLabel.Label,
            }));

            populateSelectOptions("#update-field-multiselect-choice", options);
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
            enableInputs(disabled);
        }

        function enableInputs(disable = false) {
            $(".field-input select").prop("disabled", disable);
            $(".field-input input").prop("disabled", disable);
            $(".field-input textarea").prop("disabled", disable);
        }

        function retrieveRecordValue(fieldLogicalName, attributeMetadata) {
            switch (attributeMetadata.AttributeType) {
                case "Money":
                case "Integer":
                case "BigInt":
                case "Double":
                case "Decimal":
                case "String":
                case "Memo":
                    return recordValues[fieldLogicalName];
                case "DateTime":
                    return recordValues[fieldLogicalName];
                case "Lookup":
                case "Owner":
                case "Customer":
                    const fieldLogicalNameOData = `_${fieldLogicalName}_value`;

                    let value = recordValues[fieldLogicalNameOData];
                    if (value == null) {
                        return null;
                    }

                    return `${recordValues[`${fieldLogicalNameOData}${EMC.Extension.Global.ODataFormattedValueKeys.DisplayValue}`]} (${
                        recordValues[`${fieldLogicalNameOData}${EMC.Extension.Global.ODataFormattedValueKeys.LogicalName}`]
                    })`;
                case "Boolean":
                case "Picklist":
                case "State":
                case "Status":
                    return recordValues[`${fieldLogicalName}${EMC.Extension.Global.ODataFormattedValueKeys.DisplayValue}`];
                case "Virtual":
                    return recordValues[`${fieldLogicalName}${EMC.Extension.Global.ODataFormattedValueKeys.DisplayValue}`];
                default:
                    return null;
            }
        }

        function sendUpdateRequest() {
            const fieldLogicalName = fieldAttributeMetadata.LogicalName;
            let payload = {};

            const clearField = $("#update-field-null").prop("checked");
            if (!validateInput(clearField)) {
                EMC.Extension.Global.displayNotification({ success: false, text: "Please populate the required fields" });
                return;
            }

            switch (fieldAttributeMetadata.AttributeType) {
                case "Money":
                case "Integer":
                case "BigInt":
                case "Double":
                case "Decimal":
                    const numberValue = $(".field-input-number input").val();
                    payload[fieldLogicalName] = clearField ? "null" : parseInt(numberValue);
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
                        : `/${EMC.Extension.Global.getPluralName(selectEntityValue)}(${guidValue})`;
                    break;
                case "Picklist":
                case "State":
                case "Status":
                    const selectChoiceValue = $(".field-input-select-choice select").val();
                    payload[fieldLogicalName] = clearField ? "null" : selectChoiceValue;
                    break;
                case "Boolean":
                    const booleanChoiceValue = $(".field-input-select-choice select").val();
                    payload[fieldLogicalName] = clearField ? "null" : parseBoolean(booleanChoiceValue);
                    break;
                case "Virtual":
                    const multiselectChoiceValue = $(".field-input-multiselect-choice select").val();
                    payload[fieldLogicalName] = clearField ? "null" : multiselectChoiceValue.toString();
                    break;
            }

            EMC.Extension.Global.executeChromeScript($(this).attr("data-function-name"), category, payload);
        }

        function validateInput(clearField) {
            if (clearField) {
                return true;
            }

            let value = null;

            switch (fieldAttributeMetadata.AttributeType) {
                case "Money":
                case "Integer":
                case "BigInt":
                case "Double":
                case "Decimal":
                    value = $(".field-input-number input").val();
                    break;
                case "String":
                case "DateTime":
                    value = $(".field-input-text-singleline input").val();
                    break;
                case "Memo":
                    value = $(".field-input-text-multiline textarea").val();
                    break;
                case "Lookup":
                case "Owner":
                case "Customer":
                    value = $(".field-input-text-singleline input").val();
                    break;
                case "Picklist":
                case "Boolean":
                case "State":
                case "Status":
                    value = $(".field-input-select-choice select").val();
                    break;
                case "Virtual":
                    value = $(".field-input-multiselect-choice select").val();
                    break;
            }

            if (value === "Select a choice..." || value == null || value.length === 0) {
                return false;
            }

            return true;
        }

        function parseBoolean(text) {
            return text === "1" ? true : false;
        }

        function refreshForm() {
            EMC.Extension.Global.executeChromeScript("loadAttributeMetadata", category, true);
        }

        function executeFetchXml() {
            const fetchXmlInput = $("#fetchxml-textarea").val();
            EMC.Extension.Global.executeChromeScript("executeFetchXml", category, fetchXmlInput);
        }

        function populateResultsTable(results) {
            const uniqueAttributes = getUniqueAttributes(results);
            buildResultsTable(results, uniqueAttributes);
        }

        function buildResultsTable(results, attributes) {
            resetResultsTable();

            buildTableHeader(attributes);
            buildTableBody(results, attributes);
            setResultsCountLabel(results);

            $("#accordion-header-results-viewer button.accordion-button").click();
        }

        function resetResultsTable() {
            $("#results-viewer-table-container table tr").remove();
            $("#results-viewer-table-container").hide();
            localStorage.sharedData = null;
        }

        function buildTableHeader(attributes) {
            let tableCellsHtml = "";

            $.each(attributes, function (index, attribute) {
                tableCellsHtml = tableCellsHtml.concat(`<th scope="col">${attribute}</th>`);
            });

            $("#results-viewer-table-container table thead").append(`<tr>${tableCellsHtml}</tr>`);
        }

        function buildTableBody(results, attributes) {
            $.each(results, function (index, result) {
                let tableCellsHtml = "";

                $.each(attributes, function (index, attribute) {
                    const value = result[attribute];
                    tableCellsHtml = tableCellsHtml.concat(`<td>${value ?? "---"}</td>`);
                });

                const html = `
                    <tr>
                        ${tableCellsHtml}
                    </tr>`;

                $("#results-viewer-table-container table tbody").append(html);
            });

            $("#results-viewer-table-container").toggle(results.length !== 0);
            localStorage.sharedData = JSON.stringify({ attributes: attributes, results: results });
        }

        function setResultsCountLabel(results) {
            $("#record-count").text(`${results.length} records retrieved`);
        }

        function getUniqueAttributes(arr) {
            const uniqueAttributes = new Set();

            arr.forEach((obj) => {
                Object.keys(obj).forEach((attr) => {
                    if (attr.startsWith("@")) {
                        return;
                    }
                    uniqueAttributes.add(attr);
                });
            });

            return Array.from(uniqueAttributes).sort();
        }

        function openResultsViewer() {
            chrome.tabs.create({ url: "/pages/results-viewer.html" });
        }

        function handleSpecialKeyDown(e) {
            if (e.which !== EMC.Extension.Global.KeyCodes.Tab) {
                return;
            }

            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + "\t" + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
        }

        return {
            executeOnLoad: executeOnLoad,
            populateAttributeMetadata: populateAttributeMetadata,
            refreshForm: refreshForm,
            executeFetchXml: executeFetchXml,
            populateResultsTable: populateResultsTable,
            openResultsViewer: openResultsViewer,
        };
    })();
})(this);
