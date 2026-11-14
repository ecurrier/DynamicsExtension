# 05 - Navigation entry points

Status: resolved
Type: task
Blocked by: 03

Register the Area in the Settings module with keywords that make Ctrl+K find it: feedback, bug,
report, issue, idea, suggestion, support, about, version.

Make the nav drawer footer persistent. It currently renders only while searching; it should always
be there, carrying a link that navigates to the feedback Area. The search hints keep their place
while searching.

Not the header toolbar: six buttons already and a container squeeze at panel width.

## Answer

Registered in `src/modules/settings/module.ts`; `registry.test.ts` asserts an Area exists at
`FEEDBACK_AREA_ID`, which is the contract the drawer navigates by. The drawer footer is now always
rendered, carrying the key hints while searching and the Send feedback button otherwise. The
`aria-hidden` moved from the footer onto the hints, since the other branch is focusable. Verified
at 400px and at popup width; Ctrl+K finds it on "bug".
