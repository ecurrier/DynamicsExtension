# Feedback

A way for a user to send a bug report or an idea, without the extension ever making a network
request to do it.

## The spine

The extension builds a report locally, shows it in full and editable, then opens a prefilled GitHub
issue in a new tab. The user reviews it on GitHub and submits it themselves. Submitting there lands
them on their own issue and subscribes them to it, which is the whole reply loop at no cost.

Nothing in `PRIVACY.md` changes. No new host permission, no telemetry, nothing sent to the
developer, nothing new for an Edge Add-ons reviewer to question. That constraint is the reason for
every other decision here, so a later change that adds an outbound request is not a tweak to this
feature: it is a different feature with a different privacy posture.

## What the report carries

Automatic context, safe list only, none of it read from the user's Dynamics environment:

- Extension version
- Browser name and major version
- Operating system platform
- Surface (popup, pinned window, side panel)
- Area id
- Page Context kind (model-driven app, Power Pages, or none)
- Theme preference
- UI language

Permanently excluded: org URL, user name or id, security roles, teams, record GUIDs, table and
column names, and Dataverse error bodies. Custom schema names carry a publisher prefix that names
the client, which is why table and column names are out even though they look harmless.

There is no redaction pass, deliberately. Nothing that would need redacting is collected in the
first place. A regex that mostly strips GUIDs produces confident-looking output nobody re-reads.

`utilities.getSessionSnapshot` is **not** used here. It collects exactly the tenant data this
feature excludes.

An Idea carries the version only. Browser and OS are irrelevant to a feature request; "already
shipped in 2.6" is not.

## The form

One entry point, two types, chosen with a toggle that changes the fields below it.

Bug asks:

1. What were you doing? (required)
2. What happened?
3. What did you expect?

Idea asks:

1. What are you trying to accomplish? (required)
2. What would help?

Below the fields sits the full report preview, always visible and editable, never behind a
disclosure. The privacy argument rests on the user having actually seen what they are sending.

Primary action **Continue on GitHub**, secondary **Copy report**, with a line saying a GitHub
account is needed to post.

## After the user clicks

A neutral "Opened on GitHub" state with the report intact underneath, offering **Clear** and
**Open again**. The extension never claims the report was submitted, because it cannot know: it
loses all visibility the moment the tab opens, and clearing the draft on that assumption would
destroy the user's work at exactly the moment GitHub failed.

## Length

A prefilled GitHub URL breaks around 6,000 characters of body. A counter appears only as the report
approaches the limit. Past it, the primary action swaps to **Copy report** with the reason stated.
Never silent truncation.

## Draft persistence

The draft saves as the user types and survives the popup closing, which it will: a bug report is
written about something on the Dynamics page, so the user will click back to the page to check a
value, and an extension popup closes the moment it loses focus. The draft follows them to the side
panel if they reopen there.

## Crashes

Error boundaries per Area, plus one at the app root as a backstop, so a crashing Area does not take
the shell, the nav, or the route to the feedback screen down with it. Today a render crash
white-screens with nothing captured at all.

The fallback shows a short message and **Report this**, which opens the feedback Area with Bug
preselected. It attaches the stack trace automatically, because a stack is a walk through the
extension's own public bundle rather than the user's data, and shows the error name and message as
editable text to keep or delete, because the message is the one field that can carry interpolated
tenant data.

Source maps ship. The source is already public on GitHub, so withholding them buys no secrecy and
costs every stack trace its readability.

## Prompting

Passive plus crash-contextual. Nothing nudges anyone after N days or N uses. The only unprompted
offer is at the moment something broke, which is the one prompt a user welcomes because it answers
a need they already have.

## Where it lives

A fourth Settings Area, `settings.feedback`, which doubles as the About block the extension does
not have. The version is currently defined as `__APP_VERSION__` and never displayed anywhere, so a
user cannot today tell you what version they are running.

Reachable from the nav drawer, from Ctrl+K search, and from the nav drawer footer, which becomes
persistent instead of appearing only while searching. Not the header toolbar: six buttons already,
and it squeezes at panel width.

## Intake

GitHub Issues is the front door; `.scratch/` stays the work tracker. The handoff is documented as
an intake section in `docs/agents/issue-tracker.md`.

Two plain markdown templates in `.github/ISSUE_TEMPLATE/`, not `.yml` issue forms: forms cannot be
cleanly prefilled from a URL, and their required fields would block someone who already typed
everything in the extension.

No dedupe affordance. There is nothing to deduplicate against yet.

## Not building

- No logging subsystem and no ring buffer. The visible-error choke points see mutations but not
  query failures or background-worker errors, so a buffer would look complete while omitting most
  of what goes wrong. Revisit after thirty real reports.
- No outbound POST, proxy, or third-party form service.
- No contact capture and no two-way conversation. GitHub's own subscription is the reply loop.

## Residual risk

This design trades submission friction for privacy, deliberately. Feedback volume will be lower
than a one-click form would give. If the issue count stays near zero, the lever to pull is the
crash-contextual prompt or the discoverability of the drawer link, not the privacy posture.

## Considered and not taken: a relay

GitHub has no anonymous write path. Every issue is attributed to an authenticated account, so there
is no endpoint an extension can post to without one. Posting therefore requires a GitHub account.

That matters more than it first looked. A large part of the userbase is technical but not
developers, and many run Power Tools from managed work laptops where a personal GitHub account
cannot be signed into and where github.com may be blocked outright. For those users the GitHub
route is a wall, not a step.

The only thing that removes the wall is a relay the developer runs: a small worker holding a GitHub
token, which the extension POSTs to and which creates the issue on the submitter's behalf. It was
specified down to the privacy wording and then not taken, in November 2026. What it would have
cost:

- An outbound request, and with it a new `host_permissions` entry, a rewritten Summary and a new
  section in `PRIVACY.md`, a new permission justification in `docs/store-submission.md`, and a
  correction to the certification test steps, which currently assert that all data stays in the
  browser.
- A domain. `*.workers.dev` is widely blocked by exactly the corporate proxies this would exist to
  reach, so the free subdomain would fail silently for the users it was built for.
- An optional email field, because an anonymous report cannot be followed up, and with it a
  deletion obligation for every address the developer then holds.
- A service that can fail silently and take the feedback channel with it.

Taken instead: a copyable link to the issues page, beside the copyable report, so a user who cannot
post from this device can send both to someone who can.

That is a workaround, not a fix. The signal that it is not working is reports arriving relayed by
third parties, or not arriving at all from the non-developer part of the userbase. If that happens,
the relay is the answer and this section is the brief for it.
