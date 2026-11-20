# Rowwise Media — operations hub

Start with [BUSINESS_PLAN.md](BUSINESS_PLAN.md) (deliverables A–J) and [TASKS.md](TASKS.md) (what's blocked on whom).

| Path | What |
|---|---|
| `data/niche-scores.csv` | 17-row niche scoring (weights + risk multiplier) |
| `data/finance-scenarios.md`, `tools/finance_model.py` | Revenue scenarios (estimates) |
| `data/content-calendar.csv` | 30-day calendar |
| `data/content-db.csv` | Idea backlog (32) |
| `data/production-tracker.csv` | 15-step status per video |
| `data/performance-db.csv` | Post-publish metrics (filled from Studio exports) |
| `data/finance-ledger.csv` | Authorized costs / revenue |
| `data/sources.md` | Research sources with official/measured/estimate labels |
| `brand/` | Logo, banner |
| `videos/001-lookup-wrong-answers/` | LF1: script, packaging, storyboard, shot list, QA, practice file, animation, thumbnail |
| `tools/` | finance model, brand/thumbnail renderer, grid animation renderer |
| `../.claude/agents/` | The 10 specialist subagents |

Render: `node media/tools/render_brand.mjs` · `python3 media/tools/anim_lookup.py out.mp4` · `python3 media/videos/001-lookup-wrong-answers/build_workbook.py`
