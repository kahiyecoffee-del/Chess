# LF1 — Script (draft v1)

**Working title:** VLOOKUP vs XLOOKUP: 4 ways your lookup silently returns the wrong answer
**Pillar:** Fix It + Under the Hood · **Target length:** ~9–10 min (~1,250 words at 140 wpm)
**Practice file:** `rowwise-lookups-practice.xlsx` (one sheet per case)
`[S#]` = source in the list at the end. `[ANIM]` = code-rendered grid animation. `[UI]` = Excel screen recording (shot list in `shotlist.md`).

---

### 0:00 Cold open
[UI: Sheet 1. Cell F3 shows $49.]
This lookup says product 1004 costs forty-nine dollars.
Product 1004 doesn't exist. We discontinued it. There's no error, no warning — just a believable number that's wrong.
Lookups fail like this all the time, and the dangerous failures are the quiet ones. Here are four of them, why each one happens, and the one-line fix.

### 0:25 Promise
By the end you'll know exactly when VLOOKUP lies, when XLOOKUP still can, and a thirty-second check you can run on any report. The practice file is in the description, so you can break these formulas yourself.

### 0:40 Case 1 — The default you never chose
[UI: click F3, show `=VLOOKUP(E3,$A$2:$C$10,3)`]
Look at the formula. Three arguments. The fourth one — range_lookup — is missing.
When you leave it out, VLOOKUP doesn't do an exact match. It does an approximate match. [S1]

[ANIM: grid of sorted IDs. A pointer moves down 1001, 1002, 1003 … finds 1005 is too big, steps back to 1003, highlights 49 in coral.]
Approximate match assumes the first column is sorted and returns the largest value that is less than or equal to what you asked for. [S1] We asked for 1004. The biggest ID that isn't bigger than 1004 is 1003. So you get the laptop stand's price.
Ask for 1012, an ID past the end of the list, and you get the last row's price. Still no error.
And if the column isn't sorted at all, the result is unpredictable. [S1]

[UI: add `,FALSE` → #N/A]
The fix is four characters: FALSE. Now a missing product gives you #N/A, which is what you want. An error is a warning. A wrong number is a trap.
XLOOKUP flips the default — it does an exact match unless you ask for something else. [S2] That alone is a good reason to switch if your Excel has it.

### 2:45 Case 2 — The column that moved
[UI: Sheet 2. Formula `=VLOOKUP(F2,$A$2:$D$11,3,FALSE)`]
This one was written when column 3 was Price. Then someone inserted a Category column.
[ANIM: columns slide right; the "3" in the formula stays put and now points at Product.]
VLOOKUP's column number is just a number. Excel doesn't update it when the table changes, so column 3 is now Product, and our price column shows text. On a numeric column it would show a different number, and that's when nobody notices.

[UI: XLOOKUP in H2]
XLOOKUP doesn't count columns. You point at the lookup column and the return column directly, so inserting columns doesn't break it. [S2]
If you're stuck on VLOOKUP, use MATCH on the header row instead of a typed number. That's in the practice file too.

### 4:30 Case 3 — The duplicate you didn't know about
[UI: Sheet 3. ACME appears three times.]
What plan is ACME on today? The formula says Basic.
[ANIM: three ACME rows; the search arrow starts at the top and stops at the first one.]
Both VLOOKUP and XLOOKUP return the first match they find, searching from the top. [S1][S2] Our rows are in date order, so the first match is the oldest record.
[UI: G2 `=XLOOKUP(E2,A2:A6,C2:C6,"not found",0,-1)` → Enterprise]
XLOOKUP has a search mode argument. Minus one searches from the last row upward, so you get the most recent record. [S2]
This only works if the data is sorted by date. If it isn't, sort it first, or use a method that picks the maximum date. That's a separate video.

### 6:10 Case 4 — The number that's actually text
[UI: Sheet 4. IDs pasted from a CSV. Total = 54.]
Last one, and it's the sneakiest. These IDs came from a CSV export. The total says fifty-four dollars. Looks fine.
[UI: show F3 = 0]
But the middle row returned zero. Why?
[ANIM: cell "1004␣" shown with the trailing space and left alignment; the table value 1004 as a number; the comparison fails.]
To Excel, the number 1004 and the text "1004" are different values, so the exact match fails. [S3] This one also has a trailing space.
Normally that gives you #N/A. But someone wrapped it in IFERROR with zero, so the error became a zero, and the zero disappeared into the total.

[UI: G column `=VLOOKUP(--TRIM(E3),…)` → total 83]
The fix: TRIM removes the extra space, and the double minus converts text to a number. Now the total is eighty-three.
And the lesson: don't use IFERROR to turn errors into zeros in anything that gets summed. Use it to show a clear message like "not found" instead.

### 8:00 The 30-second check
[ANIM: checklist card]
Before you trust any lookup column:
1. Does every VLOOKUP end in FALSE or zero?
2. Is the column number typed by hand?
3. Can the key appear more than once?
4. Are your keys numbers on both sides? Use COUNTIF on the key column to check for duplicates, and ISTEXT on the key to check for text.

### 8:40 Close
[UI: practice file]
The practice file has every broken formula and every fix, so you can try it yourself.
If your formulas work but your SQL joins give you more rows than you started with, that's the same duplicate problem in a different tool, and it's the next video.

---

## Sources (to be verified by QA)
- [S1] Microsoft Support — VLOOKUP function (range_lookup default TRUE / approximate; sorted requirement; "next largest value that is less than lookup_value"). https://support.microsoft.com/en-us/office/vlookup-function-0bbc8083-26fe-4963-8ab8-93a18ad188a1
- [S2] Microsoft Support — XLOOKUP function (default exact match; return_array; search_mode -1 last-to-first; availability). https://support.microsoft.com/en-us/office/xlookup-function-b7fd680e-9d10-43e6-84f9-88eae8bf5929
- [S3] Microsoft Support — How to correct a #N/A error in the VLOOKUP function (numbers stored as text; extra spaces). https://support.microsoft.com/en-us/office/how-to-correct-a-n-a-error-in-the-vlookup-function-e037d763-e5f2-46b5-8e0f-5a8db1e2ac3f

## Verification already done
- Cases 1, 2 and 4 recalculated in LibreOffice: case 1 returns 49 for 1004 and 64 for 1012 (approximate), #N/A with FALSE. ✔
- Case 4 **must be re-verified in Excel**: LibreOffice coerces "1007" (text) to match 1007, while Excel does not, per [S3]. The recorded Excel totals replace the numbers in the script if they differ.
- XLOOKUP cases need Excel 365/2021+ (LibreOffice in this container doesn't have XLOOKUP).
