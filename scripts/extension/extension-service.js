const AppNamespaces = ["Global", "Utilities", "Templates", "WebAPI", "Security", "Settings"];

chrome.runtime.onMessageExternal.addListener(function (
    request,
    sender,
    sendResponse
) {
    chrome.runtime.sendMessage(null, request);
});
