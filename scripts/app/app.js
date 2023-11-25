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

injectScript("scripts/app/app-dispatcher.js");
injectScript("scripts/app/app-constants.js");
injectScript("scripts/app/app-global.js");
injectScript("scripts/app/app-utilities.js");
injectScript("scripts/app/app-templates.js");
injectScript("scripts/app/app-webapi.js");
injectScript("scripts/app/app-security.js");

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
