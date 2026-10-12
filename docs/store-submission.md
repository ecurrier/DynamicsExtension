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

## Notes for certification

Replace `<VIDEO URL>` before pasting.

```text
TEST CREDENTIALS

This extension does not have accounts or a login of its own. It is a developer and administrator tool that runs inside Microsoft Dynamics 365 / Power Platform model-driven apps (*.dynamics.com) and uses the session the tester is already signed in with. It has no functionality on any other website.

We cannot provide credentials to a Dynamics 365 environment because the environments available to the developer belong to an employer and its clients and contain confidential business data. A test environment can be created in minutes with the free 30-day Dynamics 365 Sales trial (https://www.microsoft.com/dynamics-365/products/sales, "Try for free"); any Dynamics 365 or Dataverse environment works. A demo video showing every step below is available at: <VIDEO URL>

TEST STEPS

1. Install the extension. On any page that is not Dynamics 365, click the Power Tools toolbar icon. Expected: the popup shows "No Dynamics tab is open. Open a model-driven app or a Power Pages site, then check again." This is the only behaviour outside Dynamics 365.

2. Sign in to a Dynamics 365 environment and open a model-driven app (in the Sales trial, select the "Sales trial" link at the top and choose Sales Hub). Open Accounts and open any account record.

3. Click the Power Tools icon. Expected: the popup opens with a navigation menu of modules (Utilities, Investigate, Web API, Schema, Security, Forms, Plug-ins, Code Generation, Settings).

4. Utilities > Environment & Session. Expected: shows the signed-in user, security roles, organization version, current app, and the table and record that are open.

5. Utilities > Column Browser. Expected: lists the columns of the Account table with their logical names and types.

6. Web API > Record Columns. Expected: shows every column value of the open account record.

7. In Dynamics 365, open a different account record without reloading the page. Expected: the popup follows and shows the new record. This is what the webNavigation permission is used for.

8. Settings > Extension Settings > turn on "Open In Side Panel", then click the Power Tools icon. Expected: the same interface opens in the browser side panel instead of the popup. This is what the sidePanel permission is used for.

Optional: Settings > Environments and Settings > Service Principals let the user save environment URLs and Microsoft Entra app registration credentials for the Data Transporter and Bulk Users tools. These are not needed to test the extension.

All data stays in the browser. The extension sends requests only to the Dynamics 365 environment the tester has open and, if a service principal is saved, to login.microsoftonline.com. Privacy policy: https://github.com/ecurrier/DynamicsExtension/blob/main/PRIVACY.md
```

## If the explanation is rejected

Fall back to real credentials in a throwaway tenant:

1. Microsoft 365 Business Standard trial to create a tenant (needs a card on file).
2. Dynamics 365 Sales trial signed up with that tenant's admin account.
3. Microsoft 365 admin center: add a `reviewer` user, assign a trial license, then give it the System Administrator role in the environment.
4. Entra admin center: turn off security defaults so the reviewer is not forced into MFA registration.
5. The trial lasts 30 days and can be extended once.
