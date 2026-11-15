# Store submission text

Text to paste into Partner Center when submitting to Microsoft Edge Add-ons. Keep it in step with the manifest in `wxt.config.ts` and with `PRIVACY.md`.

## Privacy

- Accesses personal information: **Yes**
- Privacy policy URL: `https://github.com/ecurrier/DynamicsExtension/blob/main/PRIVACY.md`

## Permission justifications (1000 characters each)

### webNavigation

Dynamics 365 model-driven apps are single-page applications: moving between records, tables and views changes the URL through the History API without reloading the page, so normal tab load events do not fire. The extension listens to webNavigation.onHistoryStateUpdated to detect these in-page navigations and refresh its tools so they show the table and record that is currently open. The listener only reacts to the top-level frame of the single Dynamics 365 tab the extension is attached to; events from all other tabs are ignored. The extension does not store or transmit navigation history, and no other webNavigation event or method is used.

### sidePanel

The extension's tools can be shown in the browser's side panel so they stay open next to the Dynamics 365 page while the user works, instead of in a popup that closes when it loses focus. The sidePanel permission is used to register the panel page, to open the panel for the current tab when the user chooses that option, and to apply the user's setting for whether clicking the toolbar icon opens the side panel or the popup (sidePanel.setPanelBehavior). That setting is off by default. The side panel shows the same interface as the popup and does not access any additional data.

### declarativeNetRequestWithHostAccess

The extension adds two declarativeNetRequest session rules, each scoped as narrowly as the API allows. First, the Impersonation tool: Dataverse supports running Web API calls as another user through the MSCRMCallerID or CallerObjectId request header, so the rule sets that header only on requests to the user's own environment (urlFilter `<origin>/api/data/v*`), only in the single tab where the user started impersonation (tabIds), and removes it when they stop or the tab closes. Second, token requests: when the user has saved a service principal, the extension requests a token from login.microsoftonline.com, and Microsoft Entra rejects a request carrying a chrome-extension:// Origin header, so one rule removes the Origin header on POSTs to /oauth2/v2.0/token, restricted to those hosts, that path, and requests the extension itself initiates. Both are session rules, so neither persists. No request is blocked, redirected, or logged.

## Notes for certification

Paste as-is. Partner Center caps this field at 2000 characters; the block below is 1962 with LF endings and 1984 if the field counts CRLF, so it fits either way. Re-measure if you edit it.

```text
TEST CREDENTIALS

This extension has no account or login of its own. It is a developer and admin tool that runs inside Microsoft Dynamics 365 / Power Platform model-driven apps (*.dynamics.com) and uses the session the tester is already signed in with. It has no functionality on any other website.

We cannot provide environment credentials: the environments available to the developer belong to an employer and its clients and hold confidential business data. Any Dynamics 365 or Dataverse environment works, and a free one takes minutes with the Dynamics 365 Sales trial: https://www.microsoft.com/dynamics-365/products/sales

TEST STEPS

1. On any page that is not Dynamics 365, click the Power Tools icon. Expected: "No Dynamics tab is open. Open a model-driven app or a Power Pages site, then check again." This is the only behaviour outside Dynamics 365.

2. Sign in to Dynamics 365 and open a model-driven app (Sales Hub, in the Sales trial). Open Accounts, then open any account record.

3. Click the Power Tools icon. Expected: a navigation drawer listing thirteen modules, among them Utilities, Investigate, Web API and Security.

4. Utilities > Admin > Environment & Session. Expected: the signed-in user, security roles, organization version, and the open table and record.

5. Web API > Record Columns. Expected: every column value of the open record.

6. In Dynamics 365, open a different account record without reloading the page. Expected: the extension follows and shows the new record. This is what webNavigation is used for.

7. Settings > Extension Settings > turn on "Open In Side Panel", then click the icon. Expected: the same interface opens in the side panel. This is what sidePanel is used for.

All data stays in the browser. Requests go only to the tester's Dynamics 365 environment and, if a service principal is saved, to login.microsoftonline.com. Privacy policy: https://github.com/ecurrier/DynamicsExtension/blob/main/PRIVACY.md
```

## If the explanation is rejected

Fall back to real credentials in a throwaway tenant:

1. Microsoft 365 Business Standard trial to create a tenant (needs a card on file).
2. Dynamics 365 Sales trial signed up with that tenant's admin account.
3. Microsoft 365 admin center: add a `reviewer` user, assign a trial license, then give it the System Administrator role in the environment.
4. Entra admin center: turn off security defaults so the reviewer is not forced into MFA registration.
5. The trial lasts 30 days and can be extended once.
