const isCRMPage = Array.from(document.scripts).some(
    (x) =>
        x.src.indexOf("/uclient/scripts") !== -1 ||
        x.src.indexOf("/_static/_common/scripts/PageLoader.js") !== -1 ||
        x.src.indexOf("/_static/_common/scripts/crminternalutility.js") !== -1
);
if (!isCRMPage) {
    //return;
}

const extensionId = chrome.runtime.id;
injectHiddenAttribute('extension-id', extensionId);

injectScript("scripts/app-dispatcher.js");
injectScript("scripts/app-constants.js");
injectScript("scripts/app-utilities.js");
injectScript("scripts/app-webapi.js");

function injectHiddenAttribute(id, val) {
    const inputElement = document.createElement('input');
    inputElement.setAttribute('id', id);
    inputElement.setAttribute('value', val);
    inputElement.setAttribute('style', 'display:none;')
    document.body.appendChild(inputElement);
}

function injectScript(filePath) {
    const scriptTag = document.createElement("script");
    scriptTag.setAttribute("type", "text/javascript");
    scriptTag.setAttribute("src", chrome.runtime.getURL(filePath));
    document.body.appendChild(scriptTag);
}
