# Query Builder phase 2: smoke test on real Environments

This checklist covers what the harness cannot prove about phase 2: one Query over several Connections, and a Comparison of two Query Runs. Each step tells you what to do, what to expect, and what to report.

If a step fails, report it as "Step 7 failed: saw ...". Copy the exact message that you saw. Then continue with the next step.

The full run takes about an hour. Most of that time is step 9, which loads more than 5,000 Records on each side. The steps marked **(quick)** take about fifteen minutes. Run them first.

## Before you start

You need:

- Two saved Environments in Power Tools that each have a Service Principal. This checklist calls them **Dev** and **Test**. Step 7 needs a third one, called **Third** here. Every other step works with two.
- Dev and Test are ideally a development Environment and a test Environment. Some data in Test came from Dev by a transport that keeps the GUIDs, for example the Data Transporter or the Configuration Migration tool. Each Environment also holds some data that was created by hand. Step 8 needs the shared data, and steps 11 to 14 need the data created by hand.
- An application user for each Service Principal, with a security role that can read Accounts, Contacts, Users, Currencies and Solution Components.
- Permission to create Accounts and Contacts in Dev and in Test, for step 11.
- A custom Column on Account that exists in Dev and not in Test, for step 3. If you have none, step 3 tells you what to do instead.
- The **(quick)** steps of `smoke-test-phase-1.md`, done and passed. Phase 2 uses the same Query Runs, paging and Column metadata. If phase 1 fails, phase 2 fails for the same reason.

Do this once:

1. In the repository, run `npm run build`.
2. In Chrome, open `chrome://extensions`.
3. Turn on Developer mode.
4. Select **Load unpacked**, then select the `.output/chrome-mv3` folder. If an older build is loaded, select its reload button instead.
5. Sign in to Dev and open the Sales Hub app (or any model-driven app).
6. Open **Accounts**.
7. If Power Tools asks for site access, allow it.
8. Open the Power Tools popup. Open the navigation drawer, then select **Query Builder**.

The Query Builder tab from step 8 is the Workspace for every step. Its **Current page** Connection is the Page connection to Dev, and it runs as you. The Dev and Test Connections run as their Service Principals.

How to work with several Connections:

- The Connection picker in the header holds the first Connection. The pickers and autocomplete use the metadata of the first Connection.
- **Add Connection** is beside the picker. In a narrow window it shows only a plus icon. Its menu lists each saved Environment that has a Service Principal, and **Current page**.
- Each added Connection shows as a chip with a remove button.
- If Chrome asks for access to an Environment and the Microsoft sign-in service, allow it.
- With two or more Connections, a summary strip shows the count and time of each Query Run. Below it, the results pane has one tab for each Connection, then a **Compare** tab.

The Fetch XML samples below work on any org. Paste a sample into the Fetch XML pane, and replace all of the text that is there. To run, select **Run** or press Ctrl+Enter. If the Query Builder asks to replace the current Query, select **Replace**.

## Run over several Connections

### 1. Run one Query on three Connections (quick)

Do:

1. Make sure that the Connection picker shows **Current page**.
2. Paste sample C1 and run it.
3. Select **Add Connection**, then select Dev.
4. Select **Add Connection** again, then select Test.
5. Open the **Add Connection** menu again, and read it. Then close it.
6. Run the Query again. Select each tab in the results pane.
7. Select **History and My queries** (the clock icon). Open **History**.

```xml
<fetch>
  <entity name="account">
    <attribute name="accountid" />
    <attribute name="name" />
    <attribute name="accountnumber" />
    <attribute name="telephone1" />
    <attribute name="primarycontactid" />
    <order attribute="name" />
  </entity>
</fetch>
```

Expect:

- After step 3, the chip "Dev" shows. The summary strip and the tabs show at once, before you run again.
- In step 5, the menu does not list Dev or Test, because you cannot add an Environment two times.
- After step 6, there are four tabs: Current page, Dev, Test and Compare. Each Connection tab shows its own grid and status line.
- The strip shows each Connection's count and time, for example "50+ Records · 412 ms". The tab labels show the same counts.
- The top of History has three entries for C1, one for each Connection. The Run of step 6 replaces the entry from step 2, because the Query and Connection are the same.

Report: the text of the strip, any error banner, and the Connection of each History entry for C1.

### 2. Page and load each Query Run on its own

Do:

1. Keep the three Connections from step 1.
2. Paste sample C2 and run it. It lists the Tables in each solution, so each org has hundreds of Records.
3. Open the Test tab and select **Next page**.
4. Look at the strip.
5. Select **Load all on every Connection**.

```xml
<fetch>
  <entity name="solutioncomponent">
    <attribute name="solutioncomponentid" />
    <attribute name="componenttype" />
    <attribute name="objectid" />
    <order attribute="solutioncomponentid" />
    <filter>
      <condition attribute="componenttype" operator="eq" value="1" />
    </filter>
  </entity>
</fetch>
```

Expect:

- After **Next page**, only the Test count changes, to "100+" or to its total. The other two counts stay at "50+".
- **Load all on every Connection** loads every remaining page on each Connection. The Query Runs load at the same time. A slow Connection does not stop the others.
- At the end, no count has a "+". **Load all on every Connection** is not available.

Report: the final count of each Connection, and the text of any "Cannot load the next page" banner. If a Connection has fewer than 50 Records, report that.

### 3. One Environment lacks a Column (quick)

Use a custom Column on Account that exists in Dev and not in Test. Replace `new_customcolumn` in sample C3 with its logical name.

If you have no such Column, do one of these instead:

- If you can customize Dev, create a text Column on Account in Dev. Do not add it to Test.
- If Dev has Dynamics 365 Sales and Test does not, use the Table `opportunity` in place of `account`.
- If you can do neither, use `nosuchcolumn`. Then every Connection lacks the Column, and the Expect text changes as shown below.

Do:

1. Keep the three Connections from step 1: Current page, Dev and Test.
2. Paste sample C3, with your Column, and run it.
3. Open the Test tab, and read the message.
4. Open the **Compare** tab. Select **Current page** for the first Query Run and **Test** for the second.
5. Select **Compare**.

```xml
<fetch>
  <entity name="account">
    <attribute name="accountid" />
    <attribute name="name" />
    <attribute name="new_customcolumn" />
    <order attribute="name" />
  </entity>
</fetch>
```

Expect:

- The editor does not flag the Column, because the first Connection has it.
- The Current page and Dev tabs show Records.
- The Test tab label has an error mark, and the strip shows "Failed" for Test.
- The Test tab shows "Column new_customcolumn does not exist on Table account in Test." and "Power Tools did not send the Query to this Connection."
- For a Table that Test lacks, the message is "Table opportunity does not exist in Test."
- In step 5, the Compare tab shows "Cannot compare. The Query Run on Test failed." with the same message. Compare does not run the Query on Test again.
- With `nosuchcolumn`: the editor flags the Column, but Run still works. Each of the three tabs shows its own message with its own Connection name.

Optional: open DevTools on the Query Builder tab, and open the **Network** tab before you run. You see no Query request to the Test host.

Report: the exact message in each tab that failed, and the text of the strip.

### 4. Swap the first Connection

Do:

1. Keep the three Connections and the results from step 3.
2. In the Connection picker, select Test.
3. Select each tab in the results pane.
4. In the Fetch XML pane, put the cursor after the last `<attribute ... />` line. Type `<attribute name="` and wait two seconds.
5. Delete the text that you typed in step 4.
6. In the Connection picker, select **Current page**.

Expect:

- After step 2, the picker shows Test. The chips show Dev, then Current page. Current page takes the place where Test was.
- No tab loses its results. The Current page and Dev tabs still show Records, and the Test tab still shows its error.
- If you used a custom Column, the editor now flags it, because the first Connection is Test.
- The autocomplete list shows the Columns of Account in Test. Your custom Column is not in it.
- After step 6, the picker shows Current page, and the chips show Dev, then Test, as before.

Report: the chips after each swap, and any tab whose results cleared.

### 5. Remove the added Connections (quick)

Do:

1. Keep the Connections from step 4.
2. Select the remove button on the Test chip.
3. Select the remove button on the Dev chip.

Expect:

- After step 2, the Test tab goes away. The Current page and Dev tabs and the Compare tab stay.
- After step 3, there are no tabs, no summary strip and no **Compare** tab. The results pane looks as it did in phase 1, and the Current page results stay.

Report: what stayed on the screen after step 3.

### 6. Use the Connection chips with the keyboard only

Do not use the mouse in this step.

Do:

1. Press Tab until **Add Connection** has the focus.
2. Press Enter. Press the Down arrow to select Dev, then press Enter.
3. Open the menu again with Enter, and add Test the same way.
4. Press Shift+Tab until a chip has the focus.
5. Press the Left and Right arrows. Then press Tab.
6. Move the focus to the Test chip. Press Delete.
7. Move the focus to the Dev chip. Press Backspace.

Expect:

- The focus outline shows on each control. The tooltip of **Add Connection** shows when it gets the focus.
- Enter opens the menu, and the arrows move in it. Enter adds the Connection, and the menu closes.
- In the chips, either the arrows or Tab move the focus from one chip to the next.
- Delete removes the Test chip. Backspace removes the Dev chip. The focus moves to the next chip or to **Add Connection**, not to the top of the page.

Report: which keys moved between the chips, which keys removed a chip, and where the focus went after each removal.

### 7. Run on four Connections

This step needs a third saved Environment with a Service Principal. If you have none, report "Step 7 skipped: two Environments".

Do:

1. In the Connection picker, select Dev.
2. Select **Add Connection**, then Test. Add Third the same way.
3. Open the **Add Connection** menu, and select **Current page**.
4. Paste sample C4 and run it.
5. Point to **Add Connection**, and read its tooltip.

```xml
<fetch>
  <entity name="systemuser">
    <attribute name="systemuserid" />
    <attribute name="fullname" />
    <attribute name="domainname" />
    <attribute name="businessunitid" />
    <order attribute="fullname" />
  </entity>
</fetch>
```

Expect:

- In step 3, the menu lists **Current page**, because the first Connection is an Environment.
- After the Run, there are five tabs: Dev, Test, Third, Current page and Compare. The strip shows four counts.
- Each tab shows the Users of its own Environment.
- If no other Environment with a Service Principal is saved, **Add Connection** is not available. Its tooltip says "No other Connection is available. An Environment needs a Service Principal to be a Connection."

Report: the four counts, and the tooltip text.

## Comparison by primary key

For steps 8 to 10, remove all chips. Then select Dev in the Connection picker, and add Test.

### 8. Compare transported data by primary key (quick)

This step needs data that Test received from Dev with the same GUIDs. If your transported data is not in Account, change the Table and Columns in sample C1. If Dev and Test share no data, report "Step 8 skipped: no shared data", and do step 12.

Do:

1. Paste sample C1 and run it.
2. Open the **Compare** tab.
3. Make sure that the first Query Run is Dev, the second is Test, and the Match Key is **Primary key**.
4. Open **Columns compared**, and read the list. Then close it.
5. Select **Compare**.
6. Select each count in the row of counts.
7. Select **Different**, if it is more than 0. Expand one pair. Then select **Differing Columns**.
8. Open the same Record in Dev and in Test in the app. Compare the values with the pair.

Expect:

- **Columns compared** lists every Column of the Query except `accountid`. All are selected.
- If a side has more than 50 Records, "Loading all Records." shows during the Comparison, with the count of each side and a **Stop** button.
- The row of counts shows Only in Dev, Only in Test, Different, Same, Ambiguous and No key. Each count is a filter for the list below.
- The line below the counts says "Matched on the primary key. Ignored case and braces. Compared lookups by id."
- Records that came from Dev by the transport are in Same or Different. Records that you created by hand in one Environment are in Only in Dev or Only in Test.
- A pair in Different shows the Account name beside its GUID. Expanded, it shows each differing Column with the Dev value and the Test value. The friendly value shows first, and the raw value shows below it when it is not the same.
- **Differing Columns** shows one row for each pair, with only the Columns that differ.
- The values in the pair agree with the app.

Report: the six counts, the matching line, and any pair whose values do not agree with the app.

### 9. Compare more than 5,000 Records on one side

The Solution Component Table has more than 5,000 Records in almost every org, so use it here. The Workspace asks for 50 Records on each page. Thus 5,000 Records take 100 requests, and this step can take several minutes.

Do:

1. Paste sample C5 and run it.
2. Open the **Compare** tab. Keep **Primary key**, and select **Compare**.
3. Wait until the result shows. Write down the time that it took.
4. Select **Run**, so that the Query Runs have one page again.
5. Select **Compare**. When each side has loaded about 1,000 Records, select **Stop**.

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

Expect:

- The loaded counts go past 5,000 without an error. The tab stays responsive while it loads and while it compares.
- The result shows no "Partial" banner. The counts can be any numbers, because this step checks loading, not the data.
- After **Stop**, the result shows a banner that starts with "Partial. Compared the first".
- An "Only in" count is marked "Not reliable. Some Records were not loaded." when the other side did not load all its Records.

Report: the loaded count of each side, the six counts, the time, and the exact text of the Partial banner.

### 10. Confirm past 50,000 Records (optional)

This step is optional. Do it only if Dev or Test has a Table with more than 50,000 Records. Otherwise report "Step 10 skipped: no Table over 50,000". Power Tools shows the row count of each Table in **Row Counts**. Large Tables are often `activitypointer`, `annotation`, `email` or a custom Table. At 50 Records on each page, 50,000 Records take 1,000 requests, so this step can take a long time.

Do:

1. Paste a Query on that Table. Give it the primary key Column and one or two other Columns.
2. Run it, open the **Compare** tab, and select **Compare**.
3. When the warning shows, select **Compare the loaded Records**.

Expect:

- At 50,000 Records, the loading stops. A warning says "... More Records exist." and "If you load more than 50,000 Records, this tab can become slow."
- The warning has two buttons: **Keep loading** and **Compare the loaded Records**.
- After step 3, the result shows a "Partial" banner with the number of Records compared.

Report: the Table, the exact warning text, and the Partial banner text.

## Comparison by chosen Columns

### 11. Create Records by hand in Dev and Test

Steps 12 to 14 use these Records. Each Environment gets its own copy, so the GUIDs are not the same.

Do this in Dev:

1. Create a Contact with first name `Smoke` and last name `Compare Contact`.
2. Create an Account named `Smoke Compare A`, with Main Phone `555-0100` and that Contact as Primary Contact.
3. Create an Account named `Smoke Compare B`, with Main Phone `555-0101`.
4. Create an Account named `Smoke Compare C`, with Main Phone `555-0102`.
5. Create an Account named `Smoke Compare E`, with Main Phone `555-0104`.

Do this in Test:

1. Create a Contact with first name `Smoke` and last name `Compare Contact`.
2. Create an Account named `smoke compare a` in lower case, with Main Phone `555-0100` and that Contact as Primary Contact.
3. Create an Account named `Smoke Compare C`, with Main Phone `555-0199`.
4. Create two Accounts named `Smoke Compare E`, each with Main Phone `555-0104`.

Expect: Dev has four Smoke Compare Accounts, and Test has four. Leave **Account Number** empty on all of them.

Report: any Record that you could not create.

### 12. See the hint when no Records share a primary key

Do:

1. Keep Dev as the first Connection and Test as the added one.
2. Paste sample C6 and run it.
3. Open the **Compare** tab. Select **Primary key**, then select **Compare**.

```xml
<fetch>
  <entity name="account">
    <attribute name="accountid" />
    <attribute name="name" />
    <attribute name="accountnumber" />
    <attribute name="telephone1" />
    <attribute name="primarycontactid" />
    <attribute name="transactioncurrencyid" />
    <attribute name="createdon" />
    <filter>
      <condition attribute="name" operator="like" value="Smoke Compare%" />
    </filter>
  </entity>
</fetch>
```

Expect:

- Only in Dev is 4, and Only in Test is 4. The other counts are 0.
- The result shows "No Records share a primary key. If the Environments do not share GUIDs, use Columns for the Match Key."

Report: the six counts, and the exact hint text.

### 13. Compare by the name Column, with lookup Columns

Do:

1. Keep sample C6 and the Comparison from step 12.
2. Set the Match Key to **Columns**.
3. Open **Match Key Columns**, and read the list. Select `name`.
4. Open **Columns compared**, and read the list.
5. Select **Compare**.
6. Select each count, and read the list below it.

Expect:

- **Match Key Columns** lists the Columns of the Query, but not `accountid`. The hint below the setup says "The list shows the Columns of the Query. To use another Column, add it to the Query."
- **Columns compared** shows "4 of 5". `createdon` is in the list but not selected, because a bookkeeping Column differs between Environments. `name` is not in the list.
- The line below the counts says "Matched on name. Ignored case and outer spaces. Compared lookups by name."
- Only in Dev is 1 (B). Only in Test is 0. Different is 1 (C, with `telephone1`). Same is 1 (A). Ambiguous is 1 (E). No key is 0.
- A is in Same, though its name differs in case and its Primary Contact has a different GUID in each Environment. The Primary Contact and Currency compare by name.
- The Ambiguous group shows the one E from Dev and the two from Test. It says "These Match Key values occur more than once in a Connection, so the Records are not compared."
- If Dev and Test have different base currencies, A is in Different with `transactioncurrencyid`. That is correct.

Report: the six counts, the matching line, and the Columns that each Different pair shows.

### 14. Change the Match Key Columns

Do:

1. Keep the Comparison from step 13.
2. In **Match Key Columns**, clear `name` and select `accountnumber`. Select **Compare**.
3. In **Match Key Columns**, select `name` too, so that both are selected. Select **Compare**.

Expect:

- After step 2, every Record is in No key, because no Account Number has a value. The other counts are 0. No key says "These Records have no Match Key value, so they are not compared."
- After step 3, the counts are the same as in step 13. A Match Key of two Columns is empty only when both Columns are empty.

Report: the six counts after each Compare.

## When a Comparison cannot be made

### 15. A Query with `top`, and an aggregate Query (quick)

Do:

1. Keep two Connections. Paste sample C1.
2. Change `<fetch>` to `<fetch top="10">`, and run it. Open the **Compare** tab.
3. Paste sample C7 and run it. Open each Connection tab, then the **Compare** tab.

```xml
<fetch aggregate="true">
  <entity name="account">
    <attribute name="accountid" alias="accounts" aggregate="count" />
    <attribute name="ownerid" alias="owner" groupby="true" />
  </entity>
</fetch>
```

Expect:

- With `top`, each Connection tab shows 10 Records or fewer. The **Compare** tab shows "A Comparison cannot use a Query with top, because top returns only some of the Records." It shows no setup.
- With C7, each Connection tab shows one row for each Owner, with a count. The **Compare** tab shows 'A Comparison cannot use a Query with aggregate="true", because its rows are totals, not Records.'

Report: the exact text of the **Compare** tab for each Query.

### 16. A Comparison goes out of date (quick)

Do:

1. Make sure that the Connections are Dev and Test. Paste sample C1 and run it.
2. Open the **Compare** tab. Select **Compare**, and wait for the result.
3. In the Fetch XML pane, add `<attribute name="websiteurl" />` after the `name` attribute.
4. Read the **Compare** tab. Then select **Compare again**.
5. Open **Columns compared**, and clear one Column.
6. Select **Compare again**. Then select **Run**.
7. Open a Connection tab, then open the **Compare** tab again.

Expect:

- After step 3, a banner shows "Out of date." and "The Query, a Query Run or the setup changed after this Comparison." The old result stays, but dimmed.
- After step 4, the Query runs again on each Connection, because its text changed. Then the new result shows without the banner, and `websiteurl` is a compared Column.
- After step 5, the banner shows again. After **Run** in step 6, it shows again.
- In step 7, the setup and the result are still there.

Report: each change that did not show the banner, and anything that **Compare again** did not do.

## Open Records

### 17. Open a Record from each side of a Comparison

This step uses the Records from step 11.

Do:

1. Make sure that the Connections are Dev and Test. Paste sample C6 and run it.
2. On the **Compare** tab, set the Match Key to **Columns** with `name`. Select **Compare**.
3. Select **Only in Dev**. Select the `accountid` value of B.
4. Select **Different**, and expand the pair for C. Select the Dev heading, then the Test heading.
5. Select **Ambiguous**. Open one Record from each side.
6. Select **Same**. Open the Record for A.
7. Open the Test tab in the results pane. Select an `accountid` value.

Expect:

- B opens in Dev.
- In the expanded pair, the headings are links. Their tooltips say "Open the Record in Dev" and "Open the Record in Test". Each opens C in its own Environment.
- Each Ambiguous Record opens in its own Environment.
- **Same** says "The values are the same in both. The list shows the Records in Dev." A opens in Dev.
- The Test tab's Record opens in Test.
- Each URL has the host of its Environment and the `appid` from the saved Environment URL, or `forceUCI=1` if that URL has no `appid`.

Report: each URL that opened in the wrong Environment, and any value that was not a link.

### 18. Open Records when one side is Current page

Do:

1. Remove all chips. Select **Current page** in the Connection picker, and add Test.
2. Paste sample C1 and run it.
3. Open the **Compare** tab, keep **Primary key**, and select **Compare**.
4. Select **Only in Current page**, and open a Record.
5. Select **Only in Test**, and open a Record.

Expect:

- The Current page Record opens in the same app as your Dynamics tab, with the same host and `appid` as that tab.
- The Test Record opens on the Test host, as in step 17.

Report: the two URLs that opened.

## Coverage of the source notes

Each note below comes from the `## Comments` of an issue in `issues/`, from the list in issue 18, or from the spec. The right column gives the steps that cover it. Issue 16 has no "Not verified" notes. Its rules are listed because a real org can break them.

| Source             | Note                                                                                             | Steps         |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------- |
| 15                 | Not verified: a real org                                                                         | 1, 2, 3, 7    |
| 15                 | Not verified: the picker swap in a browser                                                       | 4             |
| 15                 | Not verified: keyboard-only use of the chips                                                     | 6             |
| 15                 | The same Environment cannot be added twice                                                       | 1             |
| 15                 | Tabs and the strip appear as soon as a second Connection is added                                | 1             |
| 15                 | Each Connection runs and pages on its own; one slow Connection does not hold the others          | 2             |
| 15                 | A Table or Column that an Environment lacks is that Connection's error, and no request is sent   | 3             |
| 15                 | Swapping the first Connection keeps both Connections' results                                    | 4             |
| 15                 | With one Connection, the Workspace looks as it did in phase 1                                    | 5             |
| 15                 | History records one entry for each Query Run                                                     | 1             |
| 15                 | Add Connection offers the Page connection when it is not in the list                             | 7             |
| 16                 | Primary keys match as GUIDs, ignoring case and braces; lookups compare by id                     | 8             |
| 16                 | Text keys match trimmed and ignoring case; lookups compare by name under chosen Columns          | 13            |
| 16                 | Bookkeeping Columns are not suggested under chosen Columns                                       | 13            |
| 16                 | Ambiguous keys are set aside as a group                                                          | 13            |
| 16                 | Empty keys go to No key; a key of several Columns is empty only when every part is empty         | 14            |
| 17                 | Not verified: the 50,000 confirmation                                                            | 10 (optional) |
| 17                 | Not verified: the "No Records share a primary key" hint                                          | 12            |
| 17                 | Not verified: a Query with `top`                                                                 | 15            |
| 17                 | Not verified: anything against a real org                                                        | 8 to 18       |
| 17                 | An aggregate Query shows why it cannot be compared                                               | 15            |
| 17                 | The Partial banner, and "only in" counts marked not reliable                                     | 9, 10         |
| 17                 | Out of date on a change to the Query, a Query Run or the setup, with Compare again               | 16            |
| 17                 | Compare runs the Query again when its text changed                                               | 16            |
| 17                 | A Query Run that failed is reported, not run again                                               | 3             |
| 17                 | The Match Key choices leave out the primary key; a hint suggests adding a Column to the Query    | 13            |
| 17                 | A pair by primary key shows the first text Column beside the GUID                                | 8             |
| 17                 | Every Record in any list opens in its own Environment                                            | 17, 18        |
| 18                 | One Query over the open tab's Page connection and two saved Environments at once                 | 1             |
| 18                 | An Environment that lacks a Column shows its own error while the others return Records           | 3             |
| 18                 | A Comparison by primary key between Environments that share transported data                     | 8             |
| 18                 | A Comparison by a chosen Column over data created by hand, including a lookup Column             | 13            |
| 18                 | A Comparison where one side has more than 5,000 Records                                          | 9             |
| 18                 | Opening a Record from each side lands in the right Environment                                   | 17, 18        |
| Spec, Acceptance   | One Query over three Connections shows three counts; one missing a Column shows its error        | 1, 3          |
| Spec, Acceptance   | A Comparison by primary key lists only in each, and differing values side by side                | 8             |
| Spec, Acceptance   | A chosen-Column Match Key pairs Records whose GUIDs differ; a same-named lookup is not different | 13            |
| Spec, Verification | Opening a Record from an Environment connection                                                  | 17            |
