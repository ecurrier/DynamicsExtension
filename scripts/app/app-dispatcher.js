const ExtensionNamespaces = ["Global", "Utilities", "Templates", "WebAPI", "Security", "Settings"];

addExtensionListener("message", (event) => {
    if (!ExtensionNamespaces.includes(event.data.category)) {
        return;
    }

    window.dispatchEvent(new CustomEvent("EMC_Message", { detail: event.data }));
});

addExtensionListener("EMC_Message", (event) => {
    window["EMC"]["App"][event.detail.category][event.detail.command](event.detail.additionalArgs);
});

function addExtensionListener(messageName, handler) {
    window.addEventListener(messageName, handler, false);
}
