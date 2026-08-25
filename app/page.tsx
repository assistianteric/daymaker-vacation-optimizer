"use client";
import { useMemo, useState } from "react";
type Holiday = {
  date: string;
  localName: string;
  name: string;
  global: boolean;
  counties: string[] | null;
  custom?: boolean;
};
type Plan = {
  start: Date;
  end: Date;
  days: Date[];
  vacation: Date[];
  holidays: Holiday[];
  score: number;
};
const REGIONS = {
  Canada: [
    ["AB", "Alberta"],
    ["BC", "British Columbia"],
    ["MB", "Manitoba"],
    ["NB", "New Brunswick"],
    ["NL", "Newfoundland & Labrador"],
    ["NT", "Northwest Territories"],
    ["NS", "Nova Scotia"],
    ["NU", "Nunavut"],
    ["ON", "Ontario"],
    ["PE", "Prince Edward Island"],
    ["QC", "Quebec"],
    ["SK", "Saskatchewan"],
    ["YT", "Yukon"],
  ],
  "United States": [
    ["AL", "Alabama"],
    ["AK", "Alaska"],
    ["AZ", "Arizona"],
    ["AR", "Arkansas"],
    ["CA", "California"],
    ["CO", "Colorado"],
    ["CT", "Connecticut"],
    ["DE", "Delaware"],
    ["FL", "Florida"],
    ["GA", "Georgia"],
    ["HI", "Hawaii"],
    ["ID", "Idaho"],
    ["IL", "Illinois"],
    ["IN", "Indiana"],
    ["IA", "Iowa"],
    ["KS", "Kansas"],
    ["KY", "Kentucky"],
    ["LA", "Louisiana"],
    ["ME", "Maine"],
    ["MD", "Maryland"],
    ["MA", "Massachusetts"],
    ["MI", "Michigan"],
    ["MN", "Minnesota"],
    ["MS", "Mississippi"],
    ["MO", "Missouri"],
    ["MT", "Montana"],
    ["NE", "Nebraska"],
    ["NV", "Nevada"],
    ["NH", "New Hampshire"],
    ["NJ", "New Jersey"],
    ["NM", "New Mexico"],
    ["NY", "New York"],
    ["NC", "North Carolina"],
    ["ND", "North Dakota"],
    ["OH", "Ohio"],
    ["OK", "Oklahoma"],
    ["OR", "Oregon"],
    ["PA", "Pennsylvania"],
    ["RI", "Rhode Island"],
    ["SC", "South Carolina"],
    ["SD", "South Dakota"],
    ["TN", "Tennessee"],
    ["TX", "Texas"],
    ["UT", "Utah"],
    ["VT", "Vermont"],
    ["VA", "Virginia"],
    ["WA", "Washington"],
    ["WV", "West Virginia"],
    ["WI", "Wisconsin"],
    ["WY", "Wyoming"],
    ["DC", "District of Columbia"],
  ],
};
const pad = (n: number) => String(n).padStart(2, "0");
const key = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const add = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const fmt = (d: Date, full = false) =>
  d.toLocaleDateString(
    "en-US",
    full
      ? { weekday: "short", month: "short", day: "numeric" }
      : { month: "short", day: "numeric" },
  );
function plansFor(holidays: Holiday[], year: number) {
  const off = new Set(holidays.map((h) => h.date));
  const all: Plan[] = [];
  for (const h of holidays) {
    const center = new Date(h.date + "T12:00:00");
    for (let before = 0; before <= 10; before++)
      for (let after = 0; after <= 10; after++) {
        const start = add(center, -before),
          end = add(center, after),
          days: Date[] = [],
          vacation: Date[] = [];
        for (let d = start; d <= end; d = add(d, 1)) {
          days.push(d);
          if (d.getDay() > 0 && d.getDay() < 6 && !off.has(key(d)))
            vacation.push(d);
        }
        if (
          start.getFullYear() === year &&
          end.getFullYear() === year &&
          days.length >= 3 &&
          vacation.length > 0 &&
          vacation.length <= 15 &&
          days.some((d) => d.getDay() === 0 || d.getDay() === 6)
        ) {
          const hs = holidays.filter(
            (x) => key(start) <= x.date && x.date <= key(end),
          );
          all.push({
            start,
            end,
            days,
            vacation,
            holidays: hs,
            score: days.length / vacation.length,
          });
        }
      }
  }
  const seen = new Set<string>();
  return all
    .sort((a, b) => b.score - a.score || b.days.length - a.days.length)
    .filter((p) => {
      const k = key(p.start) + key(p.end);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

function optimizeYear(candidates: Plan[], budget: number) {
  const sorted = [...candidates]
    .filter((plan) => plan.vacation.length <= budget)
    .sort((a, b) => a.end.getTime() - b.end.getTime());
  const previous = sorted.map((plan, index) => {
    for (let i = index - 1; i >= 0; i--)
      if (sorted[i].end < plan.start) return i;
    return -1;
  });
  const dp: Plan[][][] = Array.from({ length: sorted.length + 1 }, () =>
    Array.from({ length: budget + 1 }, () => []),
  );
  const value = (plans: Plan[]) =>
    plans.reduce((total, plan) => total + plan.days.length, 0);
  for (let i = 1; i <= sorted.length; i++) {
    const plan = sorted[i - 1];
    const cost = plan.vacation.length;
    for (let days = 0; days <= budget; days++) {
      const skip = dp[i - 1][days];
      const take =
        cost <= days
          ? [...dp[previous[i - 1] + 1][days - cost], plan]
          : [];
      dp[i][days] = value(take) > value(skip) ? take : skip;
    }
  }
  return dp[sorted.length][budget].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
}
export default function Home() {
  const yearNow = new Date().getFullYear();
  const [country, setCountry] = useState<keyof typeof REGIONS>("Canada");
  const [region, setRegion] = useState("ON");
  const [year, setYear] = useState(yearNow);
  const [vacationBudget, setVacationBudget] = useState(10);
  const [customDate, setCustomDate] = useState(`${yearNow}-01-02`);
  const [customName, setCustomName] = useState("");
  const [customDays, setCustomDays] = useState<Holiday[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const regionName = REGIONS[country].find((r) => r[0] === region)?.[1];
  const effectiveCustomDate = customDate.startsWith(`${year}-`)
    ? customDate
    : `${year}-01-02`;
  const allPlans = useMemo(() => plansFor(holidays, year), [holidays, year]);
  const plans = useMemo(
    () => optimizeYear(allPlans, vacationBudget),
    [allPlans, vacationBudget],
  );
  const vacationUsed = plans.reduce(
    (total, plan) => total + plan.vacation.length,
    0,
  );
  const totalDaysOff = plans.reduce(
    (total, plan) => total + plan.days.length,
    0,
  );
  function addCustomDay() {
    if (!effectiveCustomDate) return;
    const day: Holiday = {
      date: effectiveCustomDate,
      localName: customName.trim() || "Extra day off",
      name: customName.trim() || "Extra day off",
      global: false,
      counties: null,
      custom: true,
    };
    setCustomDays((current) =>
      [...current.filter((item) => item.date !== day.date), day].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    );
    setCustomName("");
  }
  async function build() {
    setLoading(true);
    setError("");
    try {
      const cc = country === "Canada" ? "CA" : "US";
      const res = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/${cc}`,
      );
      if (!res.ok) throw Error();
      const data: Holiday[] = await res.json();
      const regional = data.filter(
          (h) => !h.counties || h.counties.includes(`${cc}-${region}`),
        );
      setHolidays(
        [
          ...regional,
          ...customDays.filter((day) => day.date.startsWith(`${year}-`)),
        ].sort((a, b) => a.date.localeCompare(b.date)),
      );
      setSearched(true);
      setTimeout(
        () =>
          document
            .getElementById("results")
            ?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    } catch {
      setError("Holiday data could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="shell">
      <nav>
        <a className="brand" href="#">
          DAYMAKER<span>.</span>
        </a>
        <div className="navnote">Vacation strategy, simplified</div>
      </nav>
      <section className="hero">
        <div className="eyebrow">MAKE EVERY DAY OFF COUNT</div>
        <h1>
          Turn <em>vacation days</em>
          <br />
          into longer escapes.
        </h1>
        <p>
          Find the smartest ways to bridge public holidays and weekends—built
          around where you live.
        </p>
        <div className="planner">
          <label>
            COUNTRY
            <select
              value={country}
              onChange={(e) => {
                const c = e.target.value as keyof typeof REGIONS;
                setCountry(c);
                setRegion(c === "Canada" ? "ON" : "CA");
              }}
            >
              <option>Canada</option>
              <option>United States</option>
            </select>
          </label>
          <label>
            PROVINCE / STATE
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGIONS[country].map((r) => (
                <option key={r[0]} value={r[0]}>
                  {r[1]}
                </option>
              ))}
            </select>
          </label>
          <label>
            YEAR
            <select
              value={year}
              onChange={(e) => {
                const nextYear = +e.target.value;
                setYear(nextYear);
                setCustomDate(`${nextYear}-01-02`);
              }}
            >
              {[yearNow, yearNow + 1, yearNow + 2, yearNow + 3].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <label>
            VACATION DAYS
            <input
              aria-label="Available vacation days"
              type="number"
              min="1"
              max="30"
              value={vacationBudget}
              onChange={(e) =>
                setVacationBudget(
                  Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                )
              }
            />
          </label>
          <button onClick={build} disabled={loading}>
            {loading ? "Planning…" : "Build my plan"} <span>→</span>
          </button>
        </div>
        <div className="custom-days">
          <div className="custom-copy">
            <span>OPTIONAL</span>
            <b>Add employer or personal days off</b>
            <small>Easter Monday, shutdown days, flex days, and more.</small>
          </div>
          <label>
            NAME
            <input
              aria-label="Extra day off name"
              placeholder="e.g. Easter Monday"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </label>
          <label>
            DATE
            <input
              aria-label="Extra day off date"
              type="date"
              min={`${year}-01-01`}
              max={`${year}-12-31`}
              value={effectiveCustomDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          </label>
          <button className="add-day" type="button" onClick={addCustomDay}>
            Add day +
          </button>
        </div>
        {customDays.length > 0 && (
          <div className="custom-chips" aria-label="Added extra days off">
            {customDays.map((day) => (
              <span key={day.date}>
                <b>{day.localName}</b> {fmt(new Date(`${day.date}T12:00:00`))}
                <button
                  type="button"
                  aria-label={`Remove ${day.localName}`}
                  onClick={() =>
                    setCustomDays((current) =>
                      current.filter((item) => item.date !== day.date),
                    )
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </section>
      {!searched ? (
        <section className="preview">
          <div>
            <span className="step">01</span>
            <h2>
              Your year,
              <br />
              optimized.
            </h2>
            <p>
              We pair every public holiday with weekends and the fewest possible
              vacation days.
            </p>
          </div>
          <article>
            <div className="rank">
              SMART BRIDGES <b>3×</b>
            </div>
            <h3>Long weekends</h3>
            <p className="dates">HOLIDAY + VACATION + WEEKEND</p>
            <div className="score">
              <strong>4</strong>
              <span>days off</span>
              <i>for</i>
              <strong>1</strong>
              <span>vacation day</span>
            </div>
          </article>
          <article className="dark">
            <div className="rank">
              BIGGER ESCAPES <b>2.25×</b>
            </div>
            <h3>Nine-day breaks</h3>
            <p className="dates">WEEKEND TO WEEKEND</p>
            <div className="score">
              <strong>9</strong>
              <span>days off</span>
              <i>for</i>
              <strong>4</strong>
              <span>vacation days</span>
            </div>
          </article>
        </section>
      ) : (
        <section id="results" className="results">
          <header>
            <div>
              <span className="step">01</span>
              <h2>
                {regionName},<br />
                {year} optimized.
              </h2>
            </div>
            <p>
              <strong>{totalDaysOff}</strong> total days off planned
              <br />
              <strong>{vacationUsed}</strong> of {vacationBudget} vacation days
              used
              <br />
              <strong>{plans.length}</strong> non-overlapping escapes
            </p>
          </header>
          <div className="resultgrid">
            {plans.map((p, i) => (
              <article
                className={i === 0 ? "featured" : ""}
                key={key(p.start) + i}
              >
                <div className="rank">
                  {`ESCAPE ${pad(i + 1)}`}
                  <b>{p.score.toFixed(p.score % 1 ? 1 : 0)}×</b>
                </div>
                <h3>
                  {p.holidays.map((holiday) => holiday.localName).join(" + ") ||
                    "Extended break"}
                </h3>
                <p className="dates">
                  {fmt(p.start).toUpperCase()} — {fmt(p.end).toUpperCase()}
                </p>
                <div className="score">
                  <strong>{p.days.length}</strong>
                  <span>days off</span>
                  <i>for</i>
                  <strong>{p.vacation.length}</strong>
                  <span>vacation days</span>
                </div>
                <div className="book">
                  <b>Book these days</b>
                  {p.vacation.map((d) => (
                    <span key={key(d)}>
                      {d.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="holidayList">
            <div>
              <span className="step">02</span>
              <h2>
                Holiday
                <br />
                calendar.
              </h2>
            </div>
            <ul>
              {holidays.map((h) => (
                <li key={h.date + h.name}>
                  <time>
                    {new Date(h.date + "T12:00:00").toLocaleDateString(
                      "en-US",
                      { month: "short", day: "2-digit" },
                    )}
                  </time>
                  <span>
                    <b>{h.localName}</b>
                    <small>
                      {h.custom
                        ? "Employer / personal day"
                        : h.global
                          ? "Federal / nationwide"
                          : "Regional holiday"}
                    </small>
                  </span>
                  <em>
                    {new Date(h.date + "T12:00:00").toLocaleDateString(
                      "en-US",
                      { weekday: "long" },
                    )}
                  </em>
                </li>
              ))}
            </ul>
          </div>
          <p className="disclaimer">
            Holiday observance rules can vary by employer and locality. Confirm
            dates with your workplace before booking.
          </p>
        </section>
      )}
      <footer>
        <b>
          DAYMAKER<span>.</span>
        </b>
        <p>Built for better time off.</p>
        <a href="#">Back to top ↑</a>
      </footer>
    </main>
  );
}

