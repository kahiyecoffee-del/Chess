# Rowwise Media — Business Plan v1

Prepared 2026-11-20. Status: **awaiting your authorization for the steps marked 🔒 in section I.**

> **Data honesty rule.** YouTube publishes no RPM by niche or country. Every RPM/CPM number below is a
> **third-party estimate** unless marked *official*. Sources are listed in [`data/sources.md`](data/sources.md).
> The only reliable RPM is the one YouTube Studio shows us after monetization.

---

## 0. The one fact that changes the plan

YouTube is **doubling the Partner Program entry bar for new applicants on 1 February 2027** (*official*, YouTube blog, Aug 2026):

| Route | Until 31 Jan 2027 | From 1 Feb 2027 |
|---|---|---|
| Long-form | 1,000 subs + 4,000 public watch hours / 12 months | 1,000 subs + **8,000** hours / 365 days |
| Shorts | 1,000 subs + 10M Shorts views / 90 days | 1,000 subs + **20M** Shorts views / 90 days |
| Fan funding & Shopping (lower tier) | 500 subs + 3,000 h or 3M Shorts views | unchanged |

A channel starting now has 72 days before the change. Reaching 4,000 watch hours from zero in 72 days
would need roughly 50,000 long-form views at 5-minute average view duration. That isn't realistic for a new
channel without buying traffic, which we won't do. **So we plan for the 8,000-hour bar from day one.**
This makes two things decisive:

1. **Long-form watch time beats Shorts.** 20M Shorts views in 90 days is a viral-channel number, and Shorts pay about
   $0.03–0.10 per 1,000 views (estimates). Shorts are a discovery tool for us, not the monetization route.
2. **Revenue has to start before YPP.** Affiliate links, digital products and (at 500 subs) memberships do not
   need YPP. The niche has to support these from the first months.

---

## A. Niche opportunities evaluated (16 niches + 1 market variant)

Weights: RPM 25%, demand 20%, competition and opportunity 15%, sustainability 15%, production
scalability 15%, monetization diversification 10%. A **risk multiplier** (policy, YMYL and
inauthentic-content risk) is then applied. Full table with the main risk for each: [`data/niche-scores.csv`](data/niche-scores.csv).

| # | Niche | Market | Weighted | Risk-adj. | Why it ranks here |
|---|---|---|---|---|---|
| 1 | **Data skills for professionals** (Excel/Sheets + SQL + Python + AI) | EN | 7.80 | **7.80** | Business-software advertisers, evergreen search demand, templates/courses/affiliates, format is natively faceless |
| 2 | Software & AI-tool tutorials (SaaS) | EN | 7.40 | 7.03 | High RPM and affiliates, but tutorials go stale fast |
| 3 | Programming tutorials (Python/SQL/JS) | EN | 7.30 | 6.93 | Fully producible here, but incumbents are huge and the measured tech RPM is lower |
| 4 | Science/engineering explainers (code animation) | EN | 6.90 | 6.55 | Highest measured category RPM, but browse-driven and slow to start |
| 5 | Excel tutorials, German | DE | 6.80 | 6.46 | Good gap: weaker competition, CPM about half the US. **Phase-2 expansion** |
| 6 | Personal finance & investing | EN-US | 7.55 | 6.42 | Highest RPM estimates, but the most saturated niche with a YMYL credibility bar |
| 7 | Chess (engine-driven) | EN | 6.40 | 6.40 | We own an engine and renderer (best scalability), but RPM is low |
| 8 | English learning for TR/ES speakers | TR/ES | 6.15 | 6.15 | Big demand, but viewers sit in low-CPM countries |
| 9 | Real estate & home buying | EN-US | 6.80 | 5.78 | High RPM, but local and rate-cycle dependent |
| 10 | Legal/consumer-rights explainers | EN-US | 6.75 | 5.40 | Liability risk |
| 11 | AI news & tool roundups | EN | 6.35 | 5.40 | Flooded with AI slop, which is the inauthentic-content enforcement target |
| 12 | Tech product reviews | EN | 5.55 | 5.27 | Needs products and on-camera presence |
| 13 | History documentaries | EN | 5.55 | 5.27 | High research cost, low RPM |
| 14 | Health/longevity for seniors | EN-US | 6.60 | 4.62 | Medical-misinformation and sensitive-topic AI policies |
| 15 | Gaming | EN | 4.50 | 4.50 | Lowest RPM tier |
| 16 | True crime/mystery | EN | 4.95 | 3.96 | Advertiser-unfriendly |
| 17 | Kids animation | EN | 4.15 | 2.49 | Made-for-kids restrictions |

**Evidence behind the RPM column (all estimates):**
* 300-channel measured study (May 2025 – May 2026): median long-form RPM about $2.30. Education & Science $10.22,
  Gadgets & Tech $2.33, Gaming $2.05, Business & Finance $2.01 (fewer than 10 channels). *This is the most methodical source, and it ranks education above finance.*
* Estimate tables: personal finance $10–30, business/software/marketing $5–14 (US), tech $4–14, gaming $1.50–6.
* Chess: one vendor guide says $4–10. One creator self-reported $0.50–0.80 on 2–5 minute videos and $2–3 on 8–10 minute videos.

---

## B. Languages and countries

Median YouTube CPM, 2024 uploads (third-party dataset of 50 countries, countries under 1,000 views excluded):

| Market | Median CPM (USD) | Read |
|---|---|---|
| United States | 11.95 | Highest-value audience; English reaches it plus UK/CA/AU |
| Germany | 6.43 | About half the US; strong Excel culture; fewer native-language tutorial channels → **phase-2** |
| Spain | 3.14 | Spanish reaches LatAm volume, but most of it is low-CPM |
| Mexico | 1.64 | Large audience, low CPM |
| Turkey | 0.87 | About 1/14 of the US. **Not recommended as the primary language** despite being easiest for you to narrate |

**Decision: English primary, aimed at US/UK/CA/AU office professionals.** Expansion uses YouTube's own
**multi-language audio tracks / auto-dubbing**, which reached all creators in February 2026 with 27 languages. YouTube says
creators using multi-language tracks got more than 25% of watch time from non-primary languages (YouTube's figure, not independently verified).
Plan: add reviewed German and Spanish tracks to the top 20% of videos from month 3, then decide on a separate German channel using real geography data.

---

## C. Financial comparison of the top three

Same assumptions for all three: 70% long-form views, three RPM scenarios, other income as a share of ad revenue.

| | Data skills (recommended) | Software/AI-tool tutorials | Programming tutorials |
|---|---|---|---|
| Long-form RPM, cons/real/opt (est.) | $3 / $6 / $10 | $3 / $6 / $10 | $2.5 / $5 / $8 |
| Ad revenue @ 100k views/mo (realistic) | ~$420 | ~$420 | ~$350 |
| Ad revenue @ 1M views/mo (realistic) | ~$4,200 | ~$4,200 | ~$3,500 |
| Non-ad income potential | **High**: templates, courses, career audience | High: SaaS affiliates (often recurring) | Medium: courses, hosting affiliates |
| Content half-life | Long (VLOOKUP questions are 20+ years old) | Short (UI changes break videos) | Long |
| Your time per long-form video | ~1–1.5 h (record Excel UI + narration) | ~1.5–2 h + a paid account per tool | ~0.5 h (narration only) |
| Tool cost per month | ~$10–20 (Microsoft 365) + optional | $50–300 (tool subscriptions) | ~$0 |
| Revenue per hour of *your* time at 100k views/mo, 8 videos/mo (realistic, incl. other income) | ~$55/h | ~$35/h after tool costs | ~$120/h |

Programming wins on revenue per hour because I can produce almost all of it myself. Data skills wins overall because it
has a longer content half-life, a larger long tail and much stronger product revenue. **The recommended channel includes SQL and Python
as one pillar, so we get programming's cheap production too.**

Full scenario table at 100k / 500k / 1M / 5M / 10M monthly views: [`data/finance-scenarios.md`](data/finance-scenarios.md),
produced by [`tools/finance_model.py`](tools/finance_model.py). Realistic net after costs and a 20% placeholder tax:
**~$380/mo at 100k views, ~$4,600 at 1M, ~$47,000 at 10M.** Shorts ad revenue is under 1% at every level.
Seasonality: Q1 about 25% below average, Q4 about 30% above (typical pattern, estimated).
Caveats: above about 1M views/month, costs would include a paid editor and are understated in the model. Tax depends on
your residence and the US-treaty withholding on US-viewer earnings; **confirm with an accountant**. No income is guaranteed.

---

## D. Competitor analysis (data-skills space)

| Channel | Subscribers | Format | What we take from it | Gap we exploit |
|---|---|---|---|---|
| Kevin Stratvert | 4.5M (vidIQ, 13 Nov 2026) | Friendly broad Office/Windows tutorials, ~1,400 videos | Volume of simple search tutorials works | Breadth over depth; few explanations of *why* |
| Leila Gharani | 3.09M (vidIQ, 7 Nov 2026) | Polished on-camera Excel/Power BI; sells courses | Proves the course/template business model | Personality-led; head terms are owned |
| Alex The Analyst | ~1.4M (Jul 2026 listing) | Data-analyst career, SQL/Excel/Python bootcamps | Career framing drives subscriptions | Long, live-coding format; little visual explanation |
| ExcelIsFun, MyOnlineTrainingHub, Excel Campus, Chandoo, MrExcel | not verified | Deep Excel catalogues, mostly screen recordings | Long-tail search keeps old videos earning | Dated visual style, little cross-tool content (Excel ↔ SQL ↔ Python) |

**Our angle (the originality moat):** *"Why your data gives the wrong answer, and how to make it right."*
Every video centres on a **failure case** shown with our signature **animated grid** (code-rendered visuals of what
the function or join actually does to each row), then the fix in the real tool, then a check. Same problem across Excel, SQL and Python where useful.
Each video comes with a **downloadable practice file**. That makes it hard to mistake for mass-produced content and builds an email list.

Next step for Agent 1: pull real view counts for the top 50 videos on our first 30 target keywords (needs vidIQ/TubeBuddy or manual YouTube search, see J).

---

## E. Final recommendation

**Channel: "Rowwise", an English-language, faceless-but-human data-skills channel for office professionals and analysts
(Excel/Google Sheets first, then SQL, Python and AI assistants), monetized through ads, practice-file templates, courses and affiliates.**

Why this one:
1. **Search-driven.** Tutorials get found without subscribers, which is how a new channel earns watch hours.
2. **High-value audience.** Working professionals in high-CPM countries; business-software and education advertisers.
3. **Evergreen.** Videos keep earning for years, which suits your goal of recurring income with manageable work.
4. **Revenue before YPP.** Templates and affiliates can earn from the first videos.
5. **Native fit for my capabilities.** I can build the datasets, workbooks, SQL/Python demos, animations,
   subtitles, thumbnails and metadata. Your role is about 1–1.5 hours per video for Excel UI recording and narration.
6. **Safe under the 2025/2026 inauthentic-content rules.** Real demonstrations of real tools with original visuals, no AI persona, no sensitive topics.

Runner-up kept on file: **chess.** Your Checkmate Quest engine and renderer make chess the cheapest original content we could make,
but RPM caps it. Good as a later sister channel that cross-promotes the game, not as the main business.

---

## F. Channel launch strategy

**Brand** (assets in [`brand/`](brand/)):
* Name: **Rowwise** · Handle: **@rowwisehq** (claimed by owner 2026-11-20).
* Tagline: *Get the right answer from your data.*
* Palette: Ink `#13212E`, Paper `#F6F4EE`, Correct green `#1FA971`, Wrong coral `#E5533D`, Highlight amber `#F2B33D`.
* Type: Inter (UI/titles) + JetBrains Mono (formulas), both under the SIL Open Font License.
* Logo: a 3×3 cell grid with the middle row highlighted in amber ("the right row"). Files: `brand/logo.png` (800×800), `brand/banner.png` (2560×1440, text inside the 1546×423 safe area). Renderer: `tools/render_brand.mjs`.
* Thumbnail style: one giant formula or cell, a ✗ or ✓ state colour, at most 4 words, grid motif on the left, no faces, no fake arrows.

**Channel description (draft):**
> Spreadsheets, SQL and Python for people whose work depends on getting the number right. Every video takes a real
> mistake — a lookup that silently returns the wrong row, a join that doubles your revenue, an AI answer that looks right
> and isn't — shows exactly why it happens, and fixes it. Free practice file with every video. New videos Tuesdays and Fridays.

**Target viewer:** 24–45, analyst, accountant, operations, marketing or PM role in the US/UK/CA/AU who uses Excel daily and is
moving toward SQL/Python/AI. They search to solve a problem today and subscribe to stop making mistakes.

**Content pillars:**
1. **Fix It (50%)** — exact-problem tutorials aimed at search queries. Main watch-hour engine.
2. **Under the Hood (20%)** — animated "what actually happens" explainers. Brand signature and best Shorts source.
3. **AI vs Formula (15%)** — test Copilot/ChatGPT/Gemini on real spreadsheet tasks and score accuracy. Timely, high CTR, original testing.
4. **Real Data Projects (15%)** — end-to-end analysis of public-domain datasets in Excel, SQL and Python. Long watch time, portfolio value for the audience.

**Standard long-form structure (8–14 min):**
`0:00` Cold open: the wrong answer happening on screen (no logo sting, no "hey guys") →
`0:20` Stakes and promise →
`0:40` For each case: *symptom → why (animated grid) → fix (real UI) → check* →
recap card → practice-file CTA → end screen to the next video in the playlist.

**Publishing:** 2 long-form (Tue, Fri, 14:00 UTC, which is morning in the US East and afternoon in the UK) + 3 Shorts cut from them (Mon, Wed, Sat).
Reassess after 30 days using real retention and CTR data.

**Growth (Agent 2):**
* Target long-tail queries where the top results are old or slow. Search title first, curiosity thumbnail second.
* Playlists by problem ("Lookups that lie", "Joins that double your data") to chain sessions and add watch hours.
* Shorts = one "why" moment from Under the Hood plus a link to the full video. Measure subscriber conversion, not views.
* Community: answer every comment in the first 48 hours; turn questions into Fix It videos.
* Off-YouTube: practice-file landing page and email list; answer Reddit/Stack Exchange questions where relevant (no spam).
* **Never:** bought views or subscribers, sub4sub, engagement pods, misleading thumbnails, reuploads.

---

## G. 30-day calendar

Full sheet: [`data/content-calendar.csv`](data/content-calendar.csv). Summary:

| Dates | Plan |
|---|---|
| 23–29 Nov | **Production sprint, nothing published.** Bank videos 1–4 (scripts, animations, files, thumbnails). 🔒 Channel creation and branding upload. |
| Tue 1 Dec | LF1: *VLOOKUP vs XLOOKUP: 4 ways your lookup silently returns the wrong answer* |
| Wed 2 Dec | Short: VLOOKUP's default is approximate match |
| Fri 4 Dec | LF2: *SQL JOINs drawn as spreadsheets: why your row count explodes* |
| Sat 5 Dec | Short: one duplicate key = doubled revenue |
| Mon 7 Dec | Short: XLOOKUP can search from the bottom |
| Tue 8 Dec | LF3: *Remove duplicates but keep the latest record (Excel, SQL, Python)* |
| Fri 11 Dec | LF4: *I gave Copilot, ChatGPT and Gemini the same messy spreadsheet: accuracy scored* |
| Mon–Sat | Shorts from LF3/LF4 |
| Tue 15 Dec | LF5: *Numbers stored as text: the silent bug behind failed lookups and wrong SUMs* |
| Fri 18 Dec | LF6: *Real data project: what 10 years of US flight-delay data shows (Excel → SQL → Python)* |
| Tue 22 Dec | LF7: *Dynamic arrays in 12 minutes: FILTER, SORT, UNIQUE, and the #SPILL! fix* |
| 22 Dec | **First 30-day review**: CTR, AVD, retention, subs per 1k views, best pillar. Adjust the calendar. |

The 30+ idea backlog is in [`data/content-db.csv`](data/content-db.csv).

---

## H. Roadmap to ad monetization

Assumptions (to be replaced with real data): a tutorial averages about 5 minutes watched, and about 0.7% of viewers subscribe.
8,000 hours ≈ 96,000 long-form views at 5 minutes. 1,000 subs ≈ 140,000 views at 0.7%.

| Milestone | Target | Expected window | Leading indicators |
|---|---|---|---|
| A1 | 100 subs, 14 long-form videos live | Jan 2027 | CTR ≥ 4%, AVD ≥ 40% on ≥ 8-minute videos |
| A2 | First video with ≥ 5k views; winning pillar identified | Feb–Mar 2027 | Search share of traffic ≥ 40% |
| — | **First non-ad revenue** (practice-file templates, affiliates) | Feb 2027 | Email list ≥ 300 |
| A3 | 1,000 subs | May–Sep 2027 | ≥ 25k views/month |
| Interim | 500 subs + 3,000 h → **memberships, Super Thanks, Shopping** | Apr–Aug 2027 | |
| **B** | **YPP: 1,000 subs + 8,000 h / 365 days** (Shorts route not targeted) | **Sep 2027 – Mar 2028** | ~10–15k views/month on long-form |
| C | Revenue optimization: RPM by video, length tests (8 vs 12 vs 18 min), mid-rolls | YPP + 3 months | |
| D | Diversification: course, sponsors (SaaS/BI tools), German audio tracks or a DE channel | YPP + 6 months | |

**Kill/pivot rule:** after 40 long-form videos (around April 2027), if monthly views are under 10k *and* no video has passed
5k views, the CEO review switches the weight to whichever pillar performs best, or launches the runner-up (Programming or DE Excel).
We do not judge on any single video.

---

## I. What I can do alone vs what needs you

**I do autonomously (in this repo/session):** market and keyword research via web search; scripts and fact-checking against primary
documentation; storyboards; practice workbooks (openpyxl), real SQL (SQLite/DuckDB) and Python demos; code-rendered animations
and full video assembly (Python + ffmpeg + headless Chromium); subtitles (SRT); thumbnails and brand graphics; titles,
descriptions, chapters and tags; QA/policy reviews; trackers, financial model, weekly reports from analytics exports you give me.

**🔒 Needs your authorization or hands:**
1. Creating the Google account / YouTube Brand Account and channel; choosing the handle; uploading logo and banner.
2. Narration. Options: (a) **your own voice, recommended** (most authentic, ~20 minutes per video, about a $60 USB mic);
   (b) paid TTS such as ElevenLabs (paid, needs your approval); (c) free local TTS, which needs huggingface.co allowed in this environment
   (currently blocked) to download the model weights.
3. Excel UI screen recordings on a machine with Microsoft 365 (OBS, free). I write a shot list with exact clicks.
4. Publishing each video (or authorizing API uploads with your own Google Cloud OAuth client, which I will never ask you to paste into chat).
5. AdSense, payments, tax forms (W-8BEN for US withholding), affiliate and store sign-ups.
6. Any purchase: Microsoft 365, TTS, vidIQ/TubeBuddy, mic.
7. Putting the calendar in your Google Calendar or files in your Drive (connectors are available; I won't write there without a yes).

## J. Tools, integrations and APIs

| Need | Tool | Status / cost |
|---|---|---|
| Ops hub, trackers, pipeline code | This GitHub repo (`media/`) | ✅ available |
| Rendering, assembly, subtitles | Python, PIL, ffmpeg, Playwright/Chromium, ImageMagick | ✅ installed here |
| Data demos | SQLite/DuckDB, pandas, openpyxl | ✅ / pip |
| Excel UI footage | Microsoft 365 + OBS Studio on your computer | 🔒 ~$10/mo + free |
| Narration | Your mic, or ElevenLabs, or local TTS | 🔒 see I.2 |
| Music/SFX | YouTube Audio Library (free, cleared for YouTube) or none | free |
| Keyword research | Web search + YouTube search; optional vidIQ/TubeBuddy | optional, paid |
| Upload & metadata | YouTube Studio; later YouTube Data API v3 (`videos.insert`) | 🔒 OAuth |
| Analytics | YouTube Studio CSV exports → me; later YouTube Analytics API | 🔒 OAuth |
| Products | Gumroad or Lemon Squeezy for templates; email list (e.g. Buttondown) | 🔒 accounts |
| Calendar/docs | Google Calendar / Drive connectors (connected) | 🔒 confirm use |

## Organization

The 10 agents are defined as Claude Code subagents in [`.claude/agents/`](../.claude/agents/), each with its own scoped tool list.
Operating state lives in `media/data/`: content calendar, production tracker, content/research database, performance database,
finance scenarios and open tasks.
