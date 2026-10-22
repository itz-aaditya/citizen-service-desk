// Bikram Sambat (BS) Calendar dataset and converter for Nepal Standard Time (UTC+5:45)

const BS_DATA = {
  2077: { start: '2020-04-13', days: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30] },
  2078: { start: '2021-04-14', days: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30] },
  2079: { start: '2022-04-14', days: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30] },
  2080: { start: '2023-04-14', days: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30] },
  2081: { start: '2024-04-13', days: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30] },
  2082: { start: '2025-04-14', days: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31] },
  2083: { start: '2026-04-14', days: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30] },
  2084: { start: '2027-04-14', days: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30] },
  2085: { start: '2028-04-13', days: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30] },
  2086: { start: '2029-04-14', days: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30] },
  2087: { start: '2030-04-14', days: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30] },
};

export const NEP_MONTHS_EN = [
  'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

export const NEP_MONTHS_NP = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कात्तिक', 'मङ्सिर', 'पुस', 'माघ', 'फागुन', 'चैत'
];

export const NEP_DAYS_EN = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export const NEP_DAYS_NP = [
  'आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहिबार', 'शुक्रबार', 'शनिबार'
];

const NEP_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toDevanagariNumerals(num) {
  return String(num).replace(/[0-9]/g, (d) => NEP_DIGITS[parseInt(d, 10)]);
}

export function getNepalDateTime(inputDate = new Date()) {
  // Convert to Nepal Standard Time (UTC + 5:45)
  const utc = inputDate.getTime() + (inputDate.getTimezoneOffset() * 60000);
  const npt = new Date(utc + (5.75 * 3600000));

  const dayOfWeek = npt.getDay();
  const dayNameEn = NEP_DAYS_EN[dayOfWeek];
  const dayNameNp = NEP_DAYS_NP[dayOfWeek];

  // AD Formatting
  const adYear = npt.getFullYear();
  const adMonthName = npt.toLocaleString('en-US', { month: 'long', timeZone: 'Asia/Kathmandu' });
  const adMonthShort = npt.toLocaleString('en-US', { month: 'short', timeZone: 'Asia/Kathmandu' });
  const adDay = npt.getDate();

  const adDateFormatted = `${adDay} ${adMonthName} ${adYear}`;
  const adDateShort = `${adDay} ${adMonthShort} ${adYear}`;

  // Time formatting in 12-hour and 24-hour with ticking seconds
  let hours = npt.getHours();
  const minutes = String(npt.getMinutes()).padStart(2, '0');
  const seconds = String(npt.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = String(hours % 12 || 12).padStart(2, '0');
  const hours24 = String(hours).padStart(2, '0');

  const time12 = `${hours12}:${minutes}:${seconds} ${ampm}`;
  const time24 = `${hours24}:${minutes}:${seconds}`;

  // BS Conversion
  const y = npt.getFullYear();
  const m = String(npt.getMonth() + 1).padStart(2, '0');
  const d = String(npt.getDate()).padStart(2, '0');
  const targetStr = `${y}-${m}-${d}`;

  let bsYear = 2083;
  for (const [yr, val] of Object.entries(BS_DATA)) {
    if (targetStr >= val.start) bsYear = parseInt(yr, 10);
  }

  const yearData = BS_DATA[bsYear] || BS_DATA[2083];
  const startDate = new Date(yearData.start + 'T00:00:00Z');
  const currDate = new Date(targetStr + 'T00:00:00Z');
  let diffDays = Math.floor((currDate - startDate) / (1000 * 60 * 60 * 24));

  const months = yearData.days;
  let bsMonth = 1;
  let bsDay = 1;

  for (let i = 0; i < months.length; i++) {
    if (diffDays < months[i]) {
      bsMonth = i + 1;
      bsDay = diffDays + 1;
      break;
    }
    diffDays -= months[i];
  }

  const bsMonthNameEn = NEP_MONTHS_EN[bsMonth - 1];
  const bsMonthNameNp = NEP_MONTHS_NP[bsMonth - 1];

  const bsDateDevanagari = `${toDevanagariNumerals(bsDay)} ${bsMonthNameNp} ${toDevanagariNumerals(bsYear)}, ${dayNameNp}`;
  const bsDateEnglish = `${bsDay} ${bsMonthNameEn} ${bsYear} BS, ${dayNameEn}`;

  return {
    time12,
    time24,
    dayNameEn,
    dayNameNp,
    adDateFormatted,
    adDateShort,
    bsYear,
    bsMonth,
    bsDay,
    bsMonthNameEn,
    bsMonthNameNp,
    bsDateDevanagari,
    bsDateEnglish,
  };
}

