"""Revenue scenarios for the channel (CFO model).

All RPM inputs are ESTIMATES drawn from third-party benchmarks (see media/data/sources.md);
YouTube publishes no per-niche RPM. Replace them with real Studio numbers once monetized.

Run: python3 media/tools/finance_model.py
"""

MONTHLY_VIEWS = [100_000, 500_000, 1_000_000, 5_000_000, 10_000_000]

# Share of total views that are long-form (the rest are Shorts). Tutorial channels skew long-form.
LONG_SHARE = 0.70

SCENARIOS = {
    #               long-form RPM, Shorts RPM (USD per 1,000 views, after YouTube's share)
    "conservative": (3.00, 0.03),
    "realistic":    (6.00, 0.06),
    "optimistic":   (10.00, 0.12),
}

# Non-ad revenue as a fraction of ad revenue (affiliates, templates, memberships, sponsors).
# Business/software tutorial channels typically earn a large share outside AdSense; kept modest here.
OTHER_REVENUE_RATIO = {"conservative": 0.15, "realistic": 0.40, "optimistic": 0.80}

# Monthly fixed costs (USD): editing/voice/design tools, Microsoft 365, stock/music licences.
FIXED_COSTS = {"conservative": 150, "realistic": 120, "optimistic": 100}

# Placeholder blended tax/withholding rate. NOT advice: depends on residence, treaty and entity.
TAX_RATE = 0.20

# Ad-rate seasonality multipliers by quarter (typical pattern: weak Q1, strong Q4).
SEASONALITY = {"Q1": 0.75, "Q2": 0.95, "Q3": 1.00, "Q4": 1.30}


def month(views: int, scenario: str, season: float = 1.0) -> dict:
    lf_rpm, sh_rpm = SCENARIOS[scenario]
    lf = views * LONG_SHARE / 1000 * lf_rpm * season
    sh = views * (1 - LONG_SHARE) / 1000 * sh_rpm * season
    ads = lf + sh
    other = ads * OTHER_REVENUE_RATIO[scenario]
    gross = ads + other
    costs = FIXED_COSTS[scenario]
    pretax = gross - costs
    net = pretax * (1 - TAX_RATE) if pretax > 0 else pretax
    return dict(lf=lf, sh=sh, ads=ads, other=other, gross=gross, costs=costs, net=net)


def fmt(x: float) -> str:
    return f"${x:,.0f}"


def main() -> None:
    print(f"Assumptions: long-form share {LONG_SHARE:.0%}, tax placeholder {TAX_RATE:.0%}, average season (x1.00)\n")
    print("| Monthly views | Scenario | Long-form ads | Shorts ads | Other income | Costs | Net after tax |")
    print("|---|---|---|---|---|---|---|")
    for v in MONTHLY_VIEWS:
        for s in SCENARIOS:
            r = month(v, s)
            print(f"| {v:,} | {s} | {fmt(r['lf'])} | {fmt(r['sh'])} | {fmt(r['other'])} | {fmt(r['costs'])} | {fmt(r['net'])} |")
    print("\nSeasonality, realistic scenario at 1,000,000 monthly views (ad revenue only):")
    for q, m in SEASONALITY.items():
        print(f"  {q}: {fmt(month(1_000_000, 'realistic', m)['ads'])}")


if __name__ == "__main__":
    main()
