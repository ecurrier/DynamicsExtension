# Privacy Policy

**Power Tools for Power Platform/Dynamics 365** (the "extension")

Effective date: October 1, 2026

## Summary

The extension runs entirely in your browser. It does not send any data to the developer, it contains no analytics or telemetry, and it does not sell or share data with anyone. It talks only to the Dynamics 365 / Power Platform environments you use it with and to Microsoft's sign-in service.

## Information the extension accesses

The extension is a productivity tool for people who build and administer Dynamics 365 and Power Platform. To do its job it reads, and for some tools changes, data in the environment you have open. It does this through Microsoft's own Web API, using the session you are already signed in with, and only when you use a tool.

Depending on the tool, this can include:

- **Your user details in the environment:** your user name, user ID, security roles, teams, and business unit.
- **Other users' details in the environment:** names, security roles, and team memberships, when you use the security or impersonation tools.
- **Environment configuration:** table and column metadata, forms, solutions, plug-in steps, environment variables, and organization settings.
- **Record data:** the records, audit history, and plug-in trace logs you choose to view, query, edit, or copy. These may contain personal information that your organization stores in the environment.
- **The address of the Dynamics 365 tab you are working in,** so the extension knows which environment, table, and record is open. The extension does not record or transmit your browsing history.

## Information the extension stores

Everything the extension stores stays in your browser's extension storage on your device.

Kept until you delete it or remove the extension:

- Environments you save: name, URLs, environment ID, notes, and alert settings.
- Service principals you save: name, tenant ID, client ID, client secret, and notes.
- Form presets, code generation templates, and your preferences.
- The areas of the extension you visited most recently.

Kept only until the browser is closed:

- Access tokens obtained for your saved service principals.
- The state of an active impersonation session, including the name and roles of the impersonated user.
- Query results and other working data passed between the extension's own windows.

Service principal client secrets are stored unencrypted in the browser's local extension storage. Anyone with access to your browser profile may be able to read them, so only save credentials on a device you trust.

## Where information is sent

The extension makes network requests only to:

- **Your Dynamics 365 / Power Platform environments**, at the addresses you open or save, to read and write the data described above. When you use the record transport tool, records you select are copied from one of your environments to another one you choose.
- **Microsoft's sign-in service** (`login.microsoftonline.com` or `login.microsoftonline.us`), to exchange a service principal's tenant ID, client ID, and client secret for an access token. This only happens if you have saved a service principal.

No information is sent to the developer or to any other third party. Data sent to Microsoft is handled under your organization's agreement with Microsoft and the [Microsoft Privacy Statement](https://privacy.microsoft.com/privacystatement).

## Browser permissions

- **Access to `*.dynamics.com`, `*.microsoftdynamics.us`, and `*.appsplatform.us`:** to work with Dynamics 365 pages and call their Web API.
- **Access to `login.microsoftonline.com` and `login.microsoftonline.us`:** to obtain access tokens for saved service principals.
- **`storage`:** to keep the items listed above on your device.
- **`activeTab` and `scripting`:** to run the extension's tools inside the Dynamics 365 tab you are using.
- **`webNavigation`:** to notice when the Dynamics 365 tab you are working in moves to a different page, so the extension shows the right table and record.
- **`declarativeNetRequestWithHostAccess`:** to add the impersonation header to requests from a tab while impersonation is active, and to adjust the headers of the extension's own token requests.
- **`sidePanel`:** to show the extension in the browser's side panel.

## Your choices

- Delete saved environments, service principals, presets, and templates at any time from within the extension.
- Removing the extension from your browser deletes everything it has stored.
- The extension has no accounts and keeps no data outside your browser, so there is nothing for the developer to access, export, or delete on your behalf.

## Changes to this policy

If this policy changes, the updated version will be published at this address with a new effective date.

## Contact

Questions about this policy can be raised by opening an issue at <https://github.com/ecurrier/DynamicsExtension/issues>.
