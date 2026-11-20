# LF1 — Packaging, storyboard, shot list, QA

## Title options (search phrase first, promise only what the video delivers)
1. **VLOOKUP vs XLOOKUP: 4 Ways Your Lookup Silently Returns the Wrong Answer** ← primary
2. Your VLOOKUP Is Returning Wrong Numbers (No Error). Here's Why
3. 4 Silent Lookup Errors in Excel (and the One-Line Fixes)
4. XLOOKUP vs VLOOKUP: The Mistakes That Don't Show an Error
5. Why VLOOKUP Gives the Wrong Price (Approximate Match Explained)

A/B test 1 vs 2 with YouTube's "Test & compare" once available on the channel.

## Thumbnail concepts
- **A (primary):** giant cell `=VLOOKUP(E3,A:C,3)` on paper background; result cell shows `$49` with a coral ✗; small text "NO ERROR". Grid motif on the left.
- **B:** two cells side by side, `$49 ✗` (coral) vs `#N/A ✓` (green); text "WRONG > ERROR?".
- **C:** XLOOKUP vs VLOOKUP split with a "4 TRAPS" badge.
Draft render: `thumbnail-a.png`.

## Description
```
Your lookup can return a believable wrong number with no error. Here are 4 ways that happens in VLOOKUP and XLOOKUP — approximate match by default, hard-coded column numbers, duplicate keys and numbers stored as text — with the one-line fix for each.

📁 Free practice file (every broken formula + fix): <link>

Chapters
0:00 A price for a product that doesn't exist
0:40 1. Approximate match is the default
2:45 2. The column that moved
4:30 3. Duplicates return the first match
6:10 4. Numbers stored as text (and IFERROR hiding it)
8:00 The 30-second lookup check
8:40 Next: SQL joins that double your rows

Sources
VLOOKUP: https://support.microsoft.com/en-us/office/vlookup-function-0bbc8083-26fe-4963-8ab8-93a18ad188a1
XLOOKUP: https://support.microsoft.com/en-us/office/xlookup-function-b7fd680e-9d10-43e6-84f9-88eae8bf5929
#N/A in VLOOKUP: https://support.microsoft.com/en-us/office/how-to-correct-a-n-a-error-in-the-vlookup-function-e037d763-e5f2-46b5-8e0f-5a8db1e2ac3f
```
Chapter times are placeholders until the edit is locked.

**Tags (low weight; spelling variants only):** vlookup, xlookup, vlookup vs xlookup, vlookup wrong value, vlookup approximate match, excel lookup errors, numbers stored as text excel
**Playlist:** "Lookups that lie" · **End screen:** LF2 · **Category:** Education · **Made for kids:** No · **Altered/synthetic content disclosure:** not required for code-rendered diagrams; required if a synthetic voice is used to sound like a real person (it won't be).

## Storyboard (timecodes approximate)
| Time | Visual | Source |
|---|---|---|
| 0:00–0:25 | Excel: cell F3 = $49 zoom; red underline animation | UI + overlay |
| 0:25–0:40 | Title card "4 silent lookup errors", case list | ANIM |
| 0:40–1:20 | Formula bar zoom, missing 4th argument highlighted | UI |
| 1:20–2:15 | Grid animation: approximate-match pointer stops at 1003 | ANIM `anim_case1.mp4` |
| 2:15–2:45 | Type `,FALSE` → #N/A; XLOOKUP default card | UI + card |
| 2:45–4:30 | Insert column; ANIM column shift; XLOOKUP fix | UI + ANIM |
| 4:30–6:10 | Duplicates ANIM; search_mode -1 | UI + ANIM |
| 6:10–8:00 | Text vs number ANIM; IFERROR zero; TRIM/-- fix | UI + ANIM |
| 8:00–8:40 | Checklist card | ANIM |
| 8:40–9:10 | Practice file + end screen | UI + end screen |

## Shot list for the owner (Excel, Microsoft 365, 1920×1080, zoom 160%, OBS)
1. Open `rowwise-lookups-practice.xlsx`, sheet "1 Approximate default". Click F3, hold 3 s. Click F4, hold 3 s.
2. Click F3, edit the formula: add `,FALSE` before the closing bracket, press Enter. Hold 3 s.
3. Sheet "2 Inserted column": click G2, then H2. Then right-click column B → Insert, and show H2 still correct.
4. Sheet "3 Duplicates": click F2, then G2.
5. Sheet "4 Text vs number": click E3 (show it is left-aligned), click F3, then F5 total; then G3 and G5. **Write down the F5 and G5 values.**
6. Narration: read `script.md` in a quiet room, one take per section; re-read any flubbed sentence from its start.

## QA checklist (Agent 9) — status
| Item | Status |
|---|---|
| Every [S#] claim checked against the live Microsoft page | ⏳ pending (page fetch from this container) |
| Case 4 values re-verified in real Excel | ⏳ needs owner recording |
| All visuals original (code-rendered) or own screen recordings | ✔ |
| Animation shows the logical rule (largest ID ≤ lookup), not Excel's internal binary search; narration does not claim a row-by-row scan | ✔ |
| Fonts licensed (DejaVu Sans, Bitstream Vera licence; Inter/JetBrains Mono OFL if used) | ✔ |
| Music: none, or YouTube Audio Library with track recorded in LICENSES | ✔ none planned |
| Advertiser-friendly (no sensitive topics, profanity or shock) | ✔ |
| Inauthentic-content risk: distinct concept, real demonstration, synthetic narration (Kokoro). Offset with owner-recorded Excel footage and original scripts | ⚠ monitor |
| Title/thumbnail delivered by the video | ✔ |
| **Verdict** | **Not yet approved**: two pending items |
