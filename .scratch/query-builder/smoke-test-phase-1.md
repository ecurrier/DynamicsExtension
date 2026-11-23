# Query Builder phase 1: smoke test on a real org

This checklist covers what the harness cannot prove. Each step tells you what to do, what to expect, and what to report.

If a step fails, report it as "Step 7 failed: saw ...". Copy the exact message or the JSON keys that you saw. Then continue with the next step.

The full run takes about half an hour. The steps marked **(quick)** take about ten minutes. Run them first.

## Before you start

You need:

- A Dynamics 365 or Dataverse environment that you can sign in to. A Sales trial is sufficient.
- One saved Environment in Power Tools with a Service Principal, for the Environment connection steps. Its application user must have a security role that can read Accounts and Contacts.
- Permission to create two Account Records in that environment, for step 5 only.

Do this once:

1. In the repository, run `npm run build`.
2. In Chrome, open `chrome://extensions`.
3. Turn on Developer mode.
4. Select **Load unpacked**, then select the `.output/chrome-mv3` folder.
5. Sign in to the environment and open the Sales Hub app (or any model-driven app).
6. Open **Accounts**.
7. If Power Tools asks for site access, allow it.

The Fetch XML samples below work on any org. Paste a sample into the Fetch XML pane, and replace all of the text that is there. In each Query Run step, select **Run** or press Ctrl+Enter. If the Query Builder asks to replace the current Query, select **Replace**.

The **JSON** tab is beside the **Records** tab in the results pane. It shows each response that the Query Run received. If the Query Run has more than one page, the JSON tab shows a list with one object for each page. Ignore the order of the keys, because the JSON tab rebuilds each response.

## Open the Workspace

### 1. Open the Workspace from the popup (quick)

Do:

1. On the Accounts tab, select the Power Tools icon.
2. Open the navigation drawer, then select **Query Builder**.
3. Close the new tab. Select **Open in the side panel** in the popup, then select **Query Builder** again.

Expect: Each time, the Query Builder opens in a new browser tab. The tab shows the starting points (Blank, Paste Fetch XML, From a view, From the open page) beside the Fetch XML pane.

Report: what opened instead, or the error text.

### 2. Open the Workspace in the pinned window (quick)

Do:

1. In the popup, select **Open in a window** (the pin icon).
2. In the window, select **Query Builder** in the navigation drawer.
3. Read the breadcrumb at the top of the window.
4. Select **Open in a new tab**.

Expect: The Query Builder fills the pinned window. No new tab opens until you select **Open in a new tab**. A known problem can make the breadcrumb show the Area that was open before, for example "Utilities > Admin".

Report: what opened, and the exact breadcrumb text.

## Query Run over the Page connection

Use the Query Builder tab from step 1 for the steps that follow. The Connection picker in the header must show **Current page**.

### 3. Run a first Query (quick)

Do: Paste sample S1 and run it.

```xml
<fetch>
  <entity name="account">
    <attribute name="accountid" />
    <attribute name="name" />
    <attribute name="primarycontactid" />
    <attribute name="ownerid" />
    <attribute name="createdon" />
    <order attribute="name" />
  </entity>
</fetch>
```

Expect: The grid shows up to 50 Accounts. The status line shows the Record count, "more on the server" or "no more on the server", the time of the last request, and "Current page". Primary Contact and Owner show names. **Friendly values** off shows GUIDs and numbers.

Report: the error banner text, or the status line text.

### 4. Load the next page (quick)

Do:

1. Paste sample S2 and run it. Every org has more than 50 solution components.
2. Select **Next page**.
3. Select **Next page** again.

```xml
<fetch>
  <entity name="solutioncomponent">
    <attribute name="solutioncomponentid" />
    <attribute name="componenttype" />
    <attribute name="objectid" />
    <order attribute="solutioncomponentid" />
  </entity>
</fetch>
```

Expect: The status line shows "50 Records loaded", then "100 Records loaded", then "150 Records loaded". The grid shows no duplicate rows between pages. No "Cannot load the next page" banner opens.

Report: the text of the "Cannot load the next page" banner, or the Record count where it stopped.

### 5. Page with a paging cookie that holds special characters

This step needs two Account Records that you create in the app.

Do:

1. In the app, create an Account named `Smoke + Test & Co <A> "1"`.
2. Create a second Account named `Smoke + Test & Co <A> "2"`.
3. In the Query Builder, paste sample S3 and run it. The `count="1"` gives one Record on each page.
4. Select **Next page**.
5. Open the **JSON** tab. Find the key `@Microsoft.Dynamics.CRM.fetchxmlpagingcookie` in the first page.

```xml
<fetch count="1">
  <entity name="account">
    <attribute name="accountid" />
    <attribute name="name" />
    <order attribute="name" />
    <filter>
      <condition attribute="name" operator="like" value="Smoke + Test%" />
    </filter>
  </entity>
</fetch>
```

Expect: The first page shows the Account that ends in "1". After **Next page**, the grid shows both Accounts, and the status line shows "no more on the server".

Report: whether **Next page** worked. Also report whether the `pagingcookie` value contains a `+` character. Copy the full value into the report.

### 6. Load all past 5,000 Records

Do:

1. Paste sample S4 and run it.
2. Open the **JSON** tab. Write down the values of `@Microsoft.Dynamics.CRM.totalrecordcount` and `@Microsoft.Dynamics.CRM.totalrecordcountlimitexceeded`.
3. Open the **Records** tab and select **Load all**.
4. When the status line passes 5,000 Records, select **Stop**.

```xml
<fetch returntotalrecordcount="true">
  <entity name="solutioncomponent">
    <attribute name="solutioncomponentid" />
    <attribute name="componenttype" />
    <order attribute="solutioncomponentid" />
  </entity>
</fetch>
```

Expect: Both annotations are in the first page. If the Table has more than 5,000 Records, the values are `5000` and `true`. Load all continues past 5,000 without an error. **Stop** ends the load, and the Records already loaded stay in the grid.

Report: the two annotation values, and the Record count where loading stopped or failed. If the Table has fewer than 5,000 Records, report the count and skip the rest of the step.

## Column metadata

### 7. Read the Columns of the Account Table (quick)

Do:

1. Select **New**, then **Blank**, then pick **Account**.
2. On the `entity` row, select **Add**, then `filter`.
3. On the new `filter` row, select **Add**, then `condition`.
4. Pick each of these Columns in turn on the condition row: `industrycode`, `primarycontactid`, `revenue`, `createdon`.

Expect: The Column picker lists the Account Columns. For `industrycode` (a Choice), the value picker lists the Industry labels with their numbers. For `primarycontactid` (a lookup), the value is a Record search. For `revenue` (money), the value is a number field. For `createdon` (a date), the value field asks for `yyyy-mm-dd`. Each operator list matches the Column type.

Report: the error banner text, or the Column whose value editor is wrong.

### 8. Read the relationships of the Account Table

Do:

1. On the `entity` row, select **Add**, then `link-entity`.
2. Open the relationship picker on the new row.
3. Type `primarycontact`, then clear it and type `contact_customer`.

Expect: The picker finds the many-to-one relationship from `primarycontactid` to Contact. It also finds the one-to-many relationship from Contact `parentcustomerid` to Account. Picking one fills `name`, `from` and `to` on the row.

Report: what the picker listed, or the error text.

## Environment connection

### 9. Run over the Environment connection (quick)

Do:

1. Paste sample S1.
2. In the Connection picker, select your saved Environment.
3. Run the Query.

Expect: The Query stays in the editor. The old results clear. The Query Run returns up to 50 Accounts, and the status line names the Environment.

Report: the error banner text. If the Environment does not appear in the picker, report that.

### 10. Load the next page over the Environment connection (quick)

Do:

1. Keep the Environment selected.
2. Run sample S2, then select **Next page** two times.
3. If you did step 5, run sample S3 and select **Next page**.

Expect: The same results as steps 4 and 5.

Report: the text of the "Cannot load the next page" banner, and the sample that failed.

### 11. Read Column metadata over the Environment connection

Do: Keep the Environment selected. Repeat step 7.

Expect: The same results as step 7.

Report: the error text, or the Column whose value editor is wrong.

## Linked-Table Columns

Select **Current page** in the Connection picker for steps 12 and 13.

### 12. Linked Columns with an alias (quick)

Do:

1. Paste sample S5 and run it.
2. Find a row that has a Primary Contact, and a row whose `pc.fullname` cell is empty.
3. Open the **JSON** tab. Find the same two Records.

```xml
<fetch top="20">
  <entity name="account">
    <attribute name="accountid" />
    <attribute name="name" />
    <attribute name="ownerid" alias="owner" />
    <link-entity name="contact" from="contactid" to="primarycontactid" link-type="outer" alias="pc">
      <attribute name="fullname" />
      <attribute name="parentcustomerid" />
    </link-entity>
  </entity>
</fetch>
```

Expect: The grid has the columns `pc.fullname`, `pc.parentcustomerid` and `owner`, and their cells show values. The Query Builder reads these JSON keys: `pc.fullname`; `pc._parentcustomerid_value` or `pc.parentcustomerid`; and `owner`. For the Account without a contact, the JSON object has no `pc.` keys at all, not keys with `null`.

Report: every JSON key that starts with `pc.` or contains `owner`, for both Records. Also report any grid column whose cells are empty while the JSON has a value.

### 13. Linked Columns without an alias

Do:

1. Paste sample S5 again.
2. Delete `alias="owner"` and `alias="pc"`.
3. Run the Query and open the **JSON** tab.

Expect: The linked keys start with `contact` and a number, for example `contact1.fullname`. The Owner key is `_ownerid_value`. The grid shows values for the contact Columns and for Owner.

Report: every JSON key that contains `fullname`, `parentcustomerid` or `ownerid`. Also report any grid column whose cells are empty.

## Open Records

### 14. Open a Record over the Page connection

Do:

1. Select **Current page** and run sample S1.
2. Select a value in the `accountid` column.
3. Return to the Query Builder. Select a Primary Contact name.
4. Return again and select an Owner name.

Expect: Each link opens the Record in a new tab, in the same app as your Dynamics tab. The URL has the same host and `appid` as that tab. The Account, the Contact and the User open.

Report: the URL that opened, or which value was not a link.

### 15. Open a Record over the Environment connection

Do: Select your Environment, and repeat step 14.

Expect: Each link opens the Record on the Environment's host. The URL has the `appid` from the saved Environment URL, or `forceUCI=1` if that URL has no `appid`.

Report: the URL that opened, or which value was not a link.

## Pickers that read the org

### 16. Search for a Record in a lookup condition

Do:

1. Select **Current page**.
2. Select **New**, then **Blank**, then pick **Account**.
3. Add a `filter`, then a `condition`. Pick the Column `primarycontactid` and the operator `eq`.
4. In **Search Records**, type the first letters of a contact name from step 3.
5. Pick a contact, then run the Query.

Expect: The list shows up to 25 contacts whose name starts with or contains the text. The condition in the Fetch XML gets `value`, `uiname` and `uitype="contact"`. The Query Run returns the Accounts with that Primary Contact.

Report: what the list showed, or the error text.

### 17. Autocomplete for a Table that is not loaded yet

Do:

1. Reload the Query Builder tab.
2. Delete all of the text in the Fetch XML pane.
3. Type `<fetch><entity name="systemuser"><attribute name="` and wait two seconds.

Expect: The autocomplete list opens with the User Table's Columns, for example `fullname` and `domainname`. The XML does not parse yet, and that is correct.

Report: whether the list opened, and what it showed.

## Starting points

### 18. Start from a System View

Do:

1. Select **Current page**.
2. Select **New**, then **From a view**, then pick **Account**.
3. Pick **Active Accounts**.

Expect: The System Views list shows the Account views. Quick Find views carry a label. Picking a view loads its Fetch XML, formatted, into the editor and the tree.

Report: the error text, or the views that are missing.

### 19. Start from a Personal View

If you have no Personal View of Accounts, create one first. In the app, open Accounts, change the filter, and select **Save as new view**.

Do:

1. Over **Current page**, open **From a view** for **Account**. Look at **Personal Views**.
2. Select your Environment, and open **From a view** for **Account** again.

Expect:

- a. Over **Current page**, your Personal View is in the list. Picking it loads its Fetch XML.
- b. Over the Environment, the list shows the Service Principal's Personal Views (usually none). Or it shows a note that starts "Personal Views could not be read". The System Views still show.

Report: the names in each list, and the exact text of the note.

### 20. Start from the open page

Do:

1. Select **Current page**. On the Dynamics tab, open the **Active Accounts** list.
2. In the Query Builder, select **New**, then **From the open page**. Pick the grid.
3. On the Dynamics tab, open an Account that has a Contacts subgrid.
4. Select **From the open page** again, and pick the Contacts subgrid.

Expect: The list names the grids on the page. Picking one loads its Fetch XML. For the list, the Fetch XML has the view's Columns, filter and sort. For the subgrid, the Fetch XML is on `contact` and filters on the open Account.

Report: what the list showed, and the Fetch XML that loaded.

### 21. Open in Query Builder from the Generate Query dialog

Do:

1. On the Account form tab, open the Power Tools popup.
2. Go to **Utilities**, **Developer**, and select **Generate Query**.
3. Select **Open in Query Builder**.

Expect: A new browser tab opens with the Query Builder. The Fetch XML from the dialog is in the editor.

Report: what opened, and whether the Fetch XML matched.

## Long Queries ($batch)

### 22. Run a Query with 600 GUIDs

Do:

1. Copy two `accountid` values from the results of step 3.
2. Open DevTools on any tab, and open the **Console**.
3. Put the two values in the first line of the script below. Paste the script and press Enter. It copies the Fetch XML to the clipboard.
4. Paste the Fetch XML into the Query Builder.

```js
const real = ["PASTE-ACCOUNTID-1", "PASTE-ACCOUNTID-2"];
const ids = Array.from({ length: 600 }, (_, i) => real[i] ?? crypto.randomUUID());
copy(
	`<fetch>\n  <entity name="account">\n    <attribute name="name" />\n    <filter>\n      <condition attribute="accountid" operator="in">\n${ids.map((id) => `        <value>${id}</value>`).join("\n")}\n      </condition>\n    </filter>\n  </entity>\n</fetch>`
);
```

Then:

- a. Select **Current page**. Open DevTools on the **Dynamics tab**, and open the **Network** tab. Run the Query.
- b. Select your Environment. Open DevTools on the **Query Builder tab**, and open the **Network** tab. Run the Query.

Expect: In both cases, the Network tab shows a `POST` to `$batch`. The Query Run returns the two Accounts.

Report: the error banner text, the status code of the `$batch` request, and its response text.

### 23. See an error from inside a batch

Do:

1. Keep the Query from step 22.
2. Add `<attribute name="nosuchcolumn" />` after the `name` attribute.
3. Run it over **Current page**, then over your Environment.

Expect: The editor flags the unknown Column, but Run still works. The Query Run fails. The banner shows the Dataverse message that names `nosuchcolumn`, not a general batch error.

Report: the exact banner text for each Connection.

## Web API URL

### 24. Compare the Web API URL with its Fetch XML

Use this procedure for steps 24 to 32. Use **Current page**.

1. Paste the sample and run it.
2. If **Next page** is available, select **Load all**.
3. Write down the Record count from the status line.
4. Open the **Web API** tab. Write down each warning.
5. Select **Copy the URL**. Paste it into a new browser tab, and add `&$count=true` to the end.
6. Compare `@odata.count` with the Record count. If there is no `@odata.count`, count the items in `value`.

Do: Use sample S6, with a nested `or` filter and a many-to-one `link-entity`.

```xml
<fetch>
  <entity name="account">
    <attribute name="name" />
    <filter type="and">
      <condition attribute="statecode" operator="eq" value="0" />
      <filter type="or">
        <condition attribute="name" operator="like" value="A%" />
        <condition attribute="name" operator="like" value="C%" />
      </filter>
    </filter>
    <link-entity name="contact" from="contactid" to="primarycontactid" link-type="inner" alias="pc">
      <attribute name="fullname" />
    </link-entity>
  </entity>
</fetch>
```

Expect: The two counts are the same. The same Accounts are in both.

Report for steps 24 to 32: "Step N: Fetch XML gave X, Web API gave Y", the warnings, and any error from the URL.

### 25. Current user and hierarchy conditions

Do: Run each of these conditions in the `filter` of an `account` Query with `<attribute name="name" />`. Compare each one.

- a. `<condition attribute="ownerid" operator="eq-userid" />`
- b. `<condition attribute="createdby" operator="eq-userid" />`
- c. `<condition attribute="accountid" operator="eq-or-under" value="ACCOUNTID" />`, with an `accountid` from step 3.
- d. `<condition attribute="ownerid" operator="eq-useroruserhierarchy" />`

Expect: The counts are the same for each condition. If the org does not use hierarchy security, d can fail on both sides. That is correct if the two errors agree.

### 26. `in` with GUIDs

Do: Run an `account` Query with this condition. Use the two `accountid` values from step 22.

```xml
<condition attribute="accountid" operator="in">
  <value>ACCOUNTID-1</value>
  <value>ACCOUNTID-2</value>
</condition>
```

Expect: Both sides return the same two Accounts.

### 27. Dates

Do: Run each condition, and compare each one.

- a. On `contact`: `<condition attribute="birthdate" operator="on-or-after" value="1980-01-01" />`. This is a date-only Column.
- b. On `account`: `<condition attribute="createdon" operator="on" value="YYYY-MM-DD" />`, with a creation date from step 3.
- c. On `account`: `<condition attribute="createdon" operator="last-x-days" value="30" />`

Expect: The counts are the same for each condition. Also report your time zone in Power Apps personal settings.

### 28. Wildcard characters in `like`

Do: Run an `account` Query with each condition, and compare each one.

- a. `<condition attribute="name" operator="like" value="%o_t%" />`
- b. `<condition attribute="name" operator="like" value="%[ck]o%" />`

Expect: The counts are the same for each condition.

### 29. `not any` on a lookup that can be empty

Do: Run sample S7, and compare.

```xml
<fetch>
  <entity name="account">
    <attribute name="name" />
    <attribute name="primarycontactid" />
    <filter>
      <link-entity name="contact" from="contactid" to="primarycontactid" link-type="not any">
        <filter>
          <condition attribute="fullname" operator="like" value="A%" />
        </filter>
      </link-entity>
    </filter>
  </entity>
</fetch>
```

Expect: The counts are the same. Accounts with no Primary Contact are in both results, or in neither.

Report: also whether Accounts with an empty Primary Contact appear on each side.

### 30. `all` and `not all`

Do: Run sample S8, and compare. Then change `link-type="all"` to `link-type="not all"`, and compare again.

```xml
<fetch>
  <entity name="account">
    <attribute name="name" />
    <filter>
      <link-entity name="contact" from="parentcustomerid" to="accountid" link-type="all">
        <filter>
          <condition attribute="statecode" operator="eq" value="0" />
        </filter>
      </link-entity>
    </filter>
  </entity>
</fetch>
```

Expect: The counts are the same for each link type.

### 31. A multi-select Choice

Skip this step if the org has no multi-select Choice Column. Report "Step 31 skipped: no multi-select Column".

Do: Run a Query on the Table that has the Column, with this condition. Use two of the Column's values.

```xml
<condition attribute="COLUMN" operator="eq" value="VALUE1,VALUE2" />
```

Expect: The counts are the same.

### 32. Aggregates and grouping

An aggregate Query has one page. Compare the number of groups and the values in each group. `@odata.count` does not apply here.

Do:

- a. Run sample S9. It has three functions and groups by a lookup.
- b. Run sample S10. It groups by a Column of a linked Table.

```xml
<fetch aggregate="true">
  <entity name="account">
    <attribute name="accountid" alias="accounts" aggregate="count" />
    <attribute name="numberofemployees" alias="employees_sum" aggregate="sum" />
    <attribute name="numberofemployees" alias="employees_max" aggregate="max" />
    <attribute name="ownerid" alias="owner" groupby="true" />
  </entity>
</fetch>
```

```xml
<fetch aggregate="true">
  <entity name="account">
    <attribute name="accountid" alias="accounts" aggregate="count" />
    <link-entity name="contact" from="contactid" to="primarycontactid" link-type="inner" alias="pc">
      <attribute name="fullname" alias="contact_name" groupby="true" />
    </link-entity>
  </entity>
</fetch>
```

Expect: Each group has the same values on both sides. If the Web API tab shows no URL, report its message.

## Checks that do not need the org

### 33. Copy to the clipboard

Do:

1. Paste sample S1.
2. In the tree, Exclude the `createdon` row with the control at the left edge.
3. Select **Copy**, and paste into a text editor.
4. Open the Copy menu, select **Copy with Excluded rows**, and paste again.

Expect: The first paste has no `createdon` line, and the confirmation says that one Excluded row was left out. The second paste has `createdon` inside an XML comment.

Report: the two pasted texts.

### 34. Undo while the other pane is collapsed

Do:

1. Paste sample S1. Select **Collapse the Fetch XML**.
2. In the tree, delete the `createdon` row. Press Ctrl+Z.
3. Select **Restore the Fetch XML**, then select **Collapse the tree**.
4. In the Fetch XML pane, delete the `ownerid` line. Press Ctrl+Z.
5. Select **Restore the tree**.

Expect: Each Ctrl+Z restores the row. Both panes show the same Query at the end.

Report: which Ctrl+Z did nothing or restored the wrong thing.

### 35. Hints in the details pane

Do:

1. Select the `fetch` row, then select **Details**. Open **More options**.
2. Add a `link-entity` to the `entity` row. Select it, then open **More options** in the details pane.

Expect: `latematerialize` shows "Runs the Query in smaller parts to make some slow Queries faster." `intersect` shows "Marks a join that returns no Columns, such as a many-to-many intersect Table." The text is not cut off.

Report: the text that you saw, or a screenshot.

## Coverage of the source notes

Each note below comes from the `## Comments` of an issue in `issues/`, or from the spec. The right column gives the steps that cover it. Issues 01, 02, 08, 11 and 16 have no "Needs a real org" or "Not verified" notes.

| Source             | Note                                                                                           | Steps                |
| ------------------ | ---------------------------------------------------------------------------------------------- | -------------------- |
| 03                 | Paging past page 1 on both Connections                                                         | 4, 10                |
| 03                 | A paging cookie that contains `&`, `<` or `"`                                                  | 5, 10                |
| 03                 | Whether a `+` ever appears in a real cookie                                                    | 5                    |
| 03                 | The Column metadata request on a real Table                                                    | 7, 11                |
| 03                 | The relationship request's selected properties                                                 | 8                    |
| 03                 | The total count annotations with `returntotalrecordcount`                                      | 6                    |
| 04                 | A real org on either Connection                                                                | 3, 9                 |
| 04                 | The popup opening the Workspace in a real browser tab                                          | 1                    |
| 04                 | Noticed: the pinned window's breadcrumb shows the Area that was open before                    | 2                    |
| 05                 | The keys linked-Table Columns arrive under, with an alias                                      | 12                   |
| 05                 | The same, without an alias                                                                     | 13                   |
| 05                 | The key for an aliased root lookup                                                             | 12                   |
| 05                 | That null values are left out of rows                                                          | 12                   |
| 05                 | That the source tab's URL is readable for a Record link over a Page connection                 | 14                   |
| 05                 | The JSON view rebuilds each response, so key order can differ                                  | Before you start, 12 |
| 06                 | A real org                                                                                     | 7, 8, 16             |
| 06                 | Ctrl+Z in either pane while the other is collapsed                                             | 34                   |
| 07                 | A real org; the Record lookup searches through `runQuery` (top 25, `like` on the primary name) | 16                   |
| 09                 | A real org; metadata loading for a Table named only in text that does not parse yet            | 17                   |
| 10                 | The `fetchxml ne null` and parenthesised `or` filter on the views request                      | 18                   |
| 10                 | Which Personal Views appear over each Connection                                               | 19                   |
| 10                 | What a privilege error on `userquery` looks like                                               | 19                   |
| 10                 | Not verified: the real grids from `generateFetchXml` on a real page                            | 20                   |
| 10                 | Not verified: Personal Views over either Connection                                            | 19                   |
| 10                 | Not verified: real Chrome tab opening                                                          | 1, 21                |
| 12                 | `EqualUserId` and the hierarchy functions on lookup and owner Columns                          | 25                   |
| 12                 | A multi-select Choice `eq '1,9'`                                                               | 31                   |
| 12                 | Date-only literals and time-zone offsets                                                       | 27                   |
| 12                 | `_`, `[` and `]` passed through `contains`                                                     | 28                   |
| 12                 | `not (nav/col ...)` on an empty lookup                                                         | 29                   |
| 12                 | Several functions in one `aggregate()`                                                         | 32                   |
| 12                 | Grouping on `_x_value` and on `nav/col`                                                        | 32                   |
| 12                 | `In` on GUID strings                                                                           | 26                   |
| 12                 | The link types `all` and `not all`                                                             | 30                   |
| 12                 | A nested `or` with a many-to-one link returns the same Records as its Fetch XML                | 24                   |
| 12                 | Not verified: a real clipboard write                                                           | 33                   |
| 12                 | Not verified: anything against a real org                                                      | 24 to 32             |
| 13                 | A Query with several hundred GUIDs over both Connections                                       | 22                   |
| 13                 | Whether `$batch` works through the Page connection's session                                   | 22                   |
| 13                 | The absolute inner URL                                                                         | 22                   |
| 13                 | The error shape inside a batch                                                                 | 23                   |
| 13                 | Over the page Connection, the page-side `$batch` path is not exercised in the harness          | 22                   |
| 19                 | Not checked in a browser: the hint text on `latematerialize` and `intersect`                   | 35                   |
| Spec, Verification | Paging with the cookie over both Connections                                                   | 4, 5, 10             |
| Spec, Verification | The shape of linked-Table Columns in results                                                   | 12, 13               |
| Spec, Verification | `$batch`                                                                                       | 22, 23               |
| Spec, Verification | Personal Views                                                                                 | 19                   |
| Spec, Verification | The `$select` on Column metadata                                                               | 7, 11                |
| Spec, Verification | Opening a Record from an Environment connection                                                | 15                   |
| 14                 | Run over a Page connection and over an Environment connection                                  | 3, 9                 |
| 14                 | Paging past the first page and Load all past 5,000 Records                                     | 4, 6                 |
| 14                 | The Column metadata request for a Table with Choice, lookup, money and date Columns            | 7                    |
| 14                 | Linked-Table Columns in results, with and without an alias                                     | 12, 13               |
| 14                 | Opening a Record and a lookup value from each Connection kind                                  | 14, 15               |
| 14                 | Personal Views; the open page's grid as a starting point                                       | 19, 20               |
| 14                 | A Query with several hundred GUIDs                                                             | 22                   |
| 14                 | The Web API URL returning the same Records as its Fetch XML                                    | 24                   |
