# Power Tools for Power Platform

A browser extension that acts on and explains a Power Platform environment, usually the one already open in the user's tab. This glossary fixes the words used for the extension's own structure and for the platform concepts it touches.

## Extension structure

**Module**:
A top-level grouping in the extension's navigation, owning one or more Areas.
_Avoid_: Tool, feature, plugin, section

**Area**:
A single screen within a Module, and the unit the user navigates to and the extension remembers between sessions.
_Avoid_: Page, screen, tab, view

**Workspace**:
A full-window experience opened from an Area for one long-running job: the Data Transporter, the Trace Viewer, and the Results Viewer. It opens in its own browser tab, or, when Power Tools is pinned in a window, fills that window in place of the Areas until the user goes back.
_Avoid_: Tool page, full-page tool, viewer tab, standalone page

**Page Context**:
The kind of Power Platform surface the active tab is showing: a model-driven app or a Power Pages portal.
_Avoid_: Host type, app type, site type

**Page Requirement**:
The condition an Area states about the active tab before it will render.
_Avoid_: Gate, guard, precondition

## Reaching an environment

**Environment**:
A Power Platform environment, and the saved record describing how to reach one: its URLs, cloud, and Service Principal.
_Avoid_: Instance, tenant, org

**Service Principal**:
The Entra application registration the extension authenticates as when it talks to an Environment directly instead of through the open tab.
_Avoid_: App registration, client credentials, SPN

**Connection**:
The user's choice of where an Area's requests go: through the active tab, or straight to a saved Environment.
_Avoid_: Mode, endpoint, source

**Page connection**:
A Connection that rides the open tab's own Dataverse session, acting as the signed-in user.

**Environment connection**:
A Connection that goes directly to a saved Environment, authenticated as its Service Principal.

**Page Bridge**:
The extension's foothold inside the open Dynamics tab, giving it that page's own Xrm session.
_Avoid_: Content script, injected script, page script

**Host Access**:
The per-origin browser permission the user grants so the extension may talk to a given environment's host.
_Avoid_: Permission, origin grant, CORS

**Gateway**:
The set of operations an Area calls, bound to the current Connection, so one Area works unchanged against the page or a saved Environment.
_Avoid_: Client, service, API layer, repository

## Platform concepts

**Table**:
A Dataverse table definition and the records in it. Say table in prose and UI; the platform's own `entity` spelling survives only in API and type names.
_Avoid_: Entity, object

**Column**:
A single field on a Table.
_Avoid_: Attribute, field, property

**Choice**:
A Dataverse option set; one of its values is a choice option.
_Avoid_: Option set, picklist, dropdown, enum

**Record**:
A single instance of a Table, identified by a GUID.
_Avoid_: Item, object, entity instance

**Solution Layer**:
One solution's contribution to a component, ordered so the top layer is the one the platform actually applies.
_Avoid_: Override, customization, layer stack

**Automation**:
Anything the platform runs in response to a change on a Table: plug-in steps, workflows, business rules, business process flows, actions, and cloud flows.
_Avoid_: Process, trigger, logic, side effect

**Plug-in Step**:
A single registered plug-in execution, described by its message, stage, mode, and filtering columns.
_Avoid_: SDK message processing step, registration, handler

**Trace Log**:
One execution record the platform writes while plug-in tracing is on.
_Avoid_: Telemetry, diagnostic, log entry

**Environment Variable**:
A Dataverse configuration value with a definition (schema name, type, default) and an optional current value.
_Avoid_: Config setting, parameter, app setting

**Security Role**:
A named set of privileges assignable to a user or a team.
_Avoid_: Permission set, profile, access level

**Impersonation**:
Running the open tab's Dataverse requests as another user, for as long as that tab stays impersonated.
_Avoid_: Sudo, act-as, user switch, spoof

## Transport

**Transport**:
Copying records from one Environment to another.
_Avoid_: Migration, sync, import/export, ETL

**Source** and **Target**:
The Environments a Transport reads from and writes to.
_Avoid_: From/to, origin/destination

**Row**:
One record's worth of data in flight during a Transport, before it is created or updated in the Target.
_Avoid_: Item, entity, payload

**Transport Plan**:
The decision, per Row, to create, update, or skip it in the Target, computed and shown before anything is written.
_Avoid_: Diff, dry run, preview, changeset
