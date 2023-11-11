const AppNamespaces = ["Utilities", "Templates", "WebAPI"];

chrome.runtime.onMessageExternal.addListener(function (
    request,
    sender,
    sendResponse
) {
    chrome.runtime.sendMessage(null, request);
});
