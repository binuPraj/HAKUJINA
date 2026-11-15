/**
 * Pure client-side Nepali (Bikram Sambat) calendar utility.
 * No external dependencies — data embedded directly.
 */

// Bikram Sambat calendar data: year → (month day-counts, AD start date)
const BS_DATA: Array<{
  year: number;
  months: number[];
  adStart: [number, number, number]; // [year, month (1-based), day]
}> = [
  { year: 2079, months: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], adStart: [2022, 4, 14] },
  { year: 2080, months: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], adStart: [2023, 4, 14] },
  { year: 2081, months: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 29, 31], adStart: [2024, 4, 13] },
  { year: 2082, months: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], adStart: [2025, 4, 14] },
  { year: 2083, months: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], adStart: [2026, 4, 14] },
  { year: 2084, months: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], adStart: [2027, 4, 14] },
  { year: 2085, months: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], adStart: [2028, 4, 13] },
];

export const BS_MONTHS_EN = [
  "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
];

export const BS_MONTHS_NP = [
  "बैशाख", "जेठ", "असार", "श्रावण", "भदौ", "असोज",
  "कार्तिक", "मंसिर", "पुष", "माघ", "फाल्गुन", "चैत्र",
];

export const WEEKDAYS_NP = [
  { short: "आइत", full: "आइतबार", enShort: "Sun", enFull: "Sunday" },
  { short: "सोम", full: "सोमबार", enShort: "Mon", enFull: "Monday" },
  { short: "मङ्गल", full: "मङ्गलबार", enShort: "Tue", enFull: "Tuesday" },
  { short: "बुध", full: "बुधबार", enShort: "Wed", enFull: "Wednesday" },
  { short: "बिही", full: "बिहीबार", enShort: "Thu", enFull: "Thursday" },
  { short: "शुक्र", full: "शुक्रबार", enShort: "Fri", enFull: "Friday" },
  { short: "शनि", full: "शनिबार", enShort: "Sat", enFull: "Saturday" },
];

const DEVA = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

export function toDevanagari(n: number): string {
  return String(n)
    .split("")
    .map((d) => DEVA[parseInt(d, 10)] ?? d)
    .join("");
}

export interface BSDate {
  year: number;
  month: number; // 1-based
  day: number;
  monthNameEn: string;
  monthNameNp: string;
}

/** Convert an AD date to Bikram Sambat date. */
export function adToBS(adDate: Date): BSDate | null {
  const ad = new Date(adDate.getFullYear(), adDate.getMonth(), adDate.getDate());

  for (let i = 0; i < BS_DATA.length; i++) {
    const entry = BS_DATA[i];
    const totalDays = entry.months.reduce((s, v) => s + v, 0);
    const adStart = new Date(entry.adStart[0], entry.adStart[1] - 1, entry.adStart[2]);
    let adNextStart: Date;
    if (i + 1 < BS_DATA.length) {
      const next = BS_DATA[i + 1];
      adNextStart = new Date(next.adStart[0], next.adStart[1] - 1, next.adStart[2]);
    } else {
      adNextStart = new Date(adStart.getTime() + totalDays * 86400000);
    }

    if (ad >= adStart && ad < adNextStart) {
      const elapsed = Math.floor((ad.getTime() - adStart.getTime()) / 86400000);
      let remaining = elapsed;
      let bsMonth = 0;

      for (let m = 0; m < entry.months.length; m++) {
        if (remaining < entry.months[m]) {
          bsMonth = m;
          break;
        }
        remaining -= entry.months[m];
      }

      return {
        year: entry.year,
        month: bsMonth + 1,
        day: remaining + 1,
        monthNameEn: BS_MONTHS_EN[bsMonth],
        monthNameNp: BS_MONTHS_NP[bsMonth],
      };
    }
  }

  return null;
}

export interface MonthGridDay {
  iso: string; // "YYYY-MM-DD"
  adDay: number;
  adMonth: number; // 1-12
  adYear: number;
  bsDay: number;
  bsMonth: number; // 1-12
  bsYear: number;
  bsDayNp: string; // e.g. "२९"
  bsMonthNameNp: string; // "कार्तिक"
  bsMonthNameEn: string; // "Kartik"
  weekdayIndex: number; // 0-6 (0=Sun)
  weekdayShort: string; // "Sun"
  weekdayNp: string; // "आइत"
  isToday: boolean;
  isPast: boolean;
  isBookable: boolean; // today <= d <= today + 7
  isTooFar: boolean; // d > today + 7
  isWeekend: boolean; // Sat in Nepal
}

/**
 * Generates a full month calendar grid with leading empty slots and all days
 * tagged with both AD and BS metadata, and the 7-day advance booking constraint.
 */
export function buildMonthCalendar(year: number, month: number, todayDate: Date): {
  days: (MonthGridDay | null)[];
  monthNameEn: string;
  year: number;
  bsMonthsInView: string;
} {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  const leadingBlanks = firstDay.getDay(); // 0 = Sun

  const todayMidnight = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate()
  );
  const maxAdvanceDate = new Date(todayMidnight.getTime() + 7 * 86400000);

  const grid: (MonthGridDay | null)[] = [];

  // Leading blanks for proper day-of-week alignment
  for (let i = 0; i < leadingBlanks; i++) {
    grid.push(null);
  }

  const bsMonthsSeen = new Set<string>();

  for (let day = 1; day <= totalDays; day++) {
    const curDate = new Date(year, month, day);
    const bs = adToBS(curDate);
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const isToday = curDate.getTime() === todayMidnight.getTime();
    const isPast = curDate.getTime() < todayMidnight.getTime();
    const isTooFar = curDate.getTime() > maxAdvanceDate.getTime();
    const isBookable = !isPast && !isTooFar;
    const weekdayIndex = curDate.getDay();

    if (bs) {
      bsMonthsSeen.add(`${bs.monthNameNp} (${bs.monthNameEn})`);
    }

    grid.push({
      iso,
      adDay: day,
      adMonth: month + 1,
      adYear: year,
      bsDay: bs?.day ?? 0,
      bsMonth: bs?.month ?? 0,
      bsYear: bs?.year ?? 0,
      bsDayNp: bs ? toDevanagari(bs.day) : "",
      bsMonthNameNp: bs?.monthNameNp ?? "",
      bsMonthNameEn: bs?.monthNameEn ?? "",
      weekdayIndex,
      weekdayShort: WEEKDAYS_NP[weekdayIndex].enShort,
      weekdayNp: WEEKDAYS_NP[weekdayIndex].short,
      isToday,
      isPast,
      isBookable,
      isTooFar,
      isWeekend: weekdayIndex === 6, // Saturday is official weekend in Nepal
    });
  }

  const monthNamesEn = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return {
    days: grid,
    monthNameEn: monthNamesEn[month],
    year,
    bsMonthsInView: Array.from(bsMonthsSeen).join(" / "),
  };
}

/** Formats an ISO date into full bilingual string. */
export function formatBilingualDate(iso: string): { en: string; np: string } {
  if (!iso) return { en: "", np: "" };
  const [y, m, d] = iso.split("-").map(Number);
  const ad = new Date(y, m - 1, d);
  const bs = adToBS(ad);
  const weekday = WEEKDAYS_NP[ad.getDay()];

  const enMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const enStr = `${weekday.enFull}, ${d} ${enMonths[m - 1]} ${y}`;

  if (!bs) {
    return { en: enStr, np: "" };
  }

  const npStr = `${weekday.full}, ${toDevanagari(bs.day)} ${bs.monthNameNp} ${toDevanagari(bs.year)} (${bs.day} ${bs.monthNameEn} ${bs.year} BS)`;
  return { en: enStr, np: npStr };
}
