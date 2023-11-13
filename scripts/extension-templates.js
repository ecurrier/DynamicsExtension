(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.Templates = (function () {
        function executeOnLoad() {
            attachHandlers();

            initializeJSONEditor();
        }

        function attachHandlers() {
            $("#folder-selector-button").click(function () {
                $("#folder-selector").click();
            });

            $("#show-template-editor").change(showJSONPreview);
        }

        function initializeJSONEditor() {
            const container = document.getElementById("template-json-editor");
            const options = {};
            const editor = new JSONEditor(container, options);

            // set json
            const initialJson = {
                Array: [1, 2, 3],
                Boolean: true,
                Null: null,
                Number: 123,
                Object: { a: "b", c: "d" },
                String: "Hello World",
                field1: "value1",
                field2: "value2",
                field3: "value3",
                field4: "value4",
                field5: "value5",
                field6: "value6",
                field7: "value7",
                field8: "value8",
                field9: "value9",
                field10: "value10",
                field11: "value11",
                field12: "value12",
            };
            editor.set(initialJson);
        }

        function showJSONPreview() {
            const show = $(this).prop("checked");
            show ? $(".template-preview-container").show() : $(".template-preview-container").hide();
        }

        return {
            executeOnLoad: executeOnLoad,
        };
    })();
})(this);
