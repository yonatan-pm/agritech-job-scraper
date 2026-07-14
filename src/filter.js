/** Keywords for agronomy & agritech roles (Hebrew + English). */
export const KEYWORDS = [
  // Agronomy
  "אגרונום",
  "אגרונומית",
  "אגרונומים",
  "אגרונום/ית",
  "אגרונום.ית",
  "אגרונום/ת",
  "agronom",
  "agronomy",
  "מדעי הצמח",
  "מדעי הצמחים",
  "הנדסאי חקלאות",
  "הנדסת חקלאות",
  // Agritech / precision ag
  "אגרוטק",
  "אגריטק",
  "אגרי-טק",
  "agritech",
  "agri-tech",
  "agrotech",
  "חקלאות מדויקת",
  "precision agriculture",
  "precision ag",
  "בקרת השקיה",
  "חיישנ",
  "sensor",
  "iot",
  "ביוטכנולוג",
  "biotech",
  "מו\"פ",
  'מו"פ',
  "מחקר ופיתוח",
  "זרעי",
  "טיפוח",
  "הדברה ביולוגית",
  "אוטומציה",
  "automation",
  "טכנולוגיות",
  "טכנולוגיה",
  "technology",
  "בתי צמיחה",
  "הידרופוני",
  "vertical farm",
  "data",
  "נתונים",
];

/** Exclude pure gardening / general labor unless also agritech. */
const WEAK_ONLY = [
  "גינון",
  "גנן",
  "נוי",
  "משתלה",
  "נהג",
  "אריזה",
  "ליקוט",
  "כלבנ",
];

const STRONG = [
  "אגרונום",
  "אגרונומית",
  "אגרונומים",
  "אגרונום/ית",
  "אגרונום.ית",
  "agronom",
  "agronomy",
  "אגרוטק",
  "אגריטק",
  "אגרי-טק",
  "agritech",
  "agri-tech",
  "agrotech",
  "חקלאות מדויקת",
  "precision",
  "בקרת השקיה",
  "ביוטכנולוג",
  "biotech",
  "מדעי הצמח",
  "הנדסאי חקלאות",
  "הנדסת חקלאות",
  "חיישנ",
  "iot",
];

function normalize(text) {
  return (text || "").toLowerCase();
}

/**
 * Returns true if the job looks like agronomy or agritech.
 */
export function isAgronomyOrAgritech(job) {
  const haystack = normalize(`${job.title} ${job.description} ${job.location}`);

  const hasStrong = STRONG.some((k) => haystack.includes(k.toLowerCase()));
  if (hasStrong) return true;

  const hasKeyword = KEYWORDS.some((k) => haystack.includes(k.toLowerCase()));
  if (!hasKeyword) return false;

  // Keyword hit that is only weak gardening/labor → skip
  const onlyWeak =
    WEAK_ONLY.some((k) => haystack.includes(k)) &&
    !STRONG.some((k) => haystack.includes(k.toLowerCase())) &&
    !/(טכנולוג|tech|חיישנ|sensor|אוטומצ|iot|מו"פ|מחקר)/i.test(haystack);

  return !onlyWeak;
}
