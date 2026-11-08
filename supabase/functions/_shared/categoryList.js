// רשימת הקטגוריות המותרות לסיווג (מזהה → תווית), משותפת לשרת ולטלפון
export const EXPENSE_LABELS = {
  food: 'מזון', prepared_food: 'אוכל מוכן', water_bar: 'בר מים', smoking: 'עישון',
  groceries_weekly: 'קניות שבועיות במרכול', grocery_local: 'מכולת שכונתית',
  fruits_vegetables: 'פירות וירקות', meat_poultry: 'בשר ועוף', fish: 'דגים',
  dairy: 'מוצרי חלב', bakery: 'מאפייה וחלות', drinks_snacks: 'שתייה וחטיפים',
  shabbat_food: 'צרכי שבת', yom_tov_food: 'צרכי חג ומועד', catering_events: 'קייטרינג ואירוח',
  kashrut_extra: 'הידורי כשרות',
  pharma_toiletries: 'פארמה וטואלטיקה', rent: 'שכר דירה', mortgage: 'משכנתה',
  municipal_tax: 'ארנונה', building_committee: 'ועד בית', property_insurance: 'ביטוח דירה',
  electricity: 'חשמל', water_sewage: 'מים וביוב', gas: 'גז', garden: 'גינה',
  cleaning: 'ניקיון', home_repairs: 'תיקונים בבית', health_general: 'בריאות',
  optics: 'אופטיקה', extra_medical_insurance: 'ביטוח רפואי נוסף', dental: 'טיפולי שיניים',
  private_treatments: 'טיפולים פרטיים', health_fund: 'קופת חולים', medications: 'תרופות',
  education_general: 'חינוך', school: 'בית ספר', school_transport: 'הסעות',
  after_school_activities: 'חוגים', adult_studies: 'לימודים לבוגרים', day_care: 'מסגרות יום',
  noon_care: 'צהרון', summer_care: 'מסגרות קיץ', babysitter_nanny: 'מטפלת',
  private_lesson: 'שיעור פרטי', clothing_general: 'ביגוד והנעלה', parents_clothing: 'ביגוד הורים',
  children_clothing: 'ביגוד ילדים', shoes: 'נעליים', transport_general: 'תחבורה',
  fuel: 'דלק', car_insurance: 'ביטוח רכב', parking: 'חניה', toll_roads: 'כבישי אגרה',
  leasing: 'ליסינג', car_license: 'רישוי רכב', public_transport: 'תחבורה ציבורית',
  shared_transport: 'תחבורה שיתופית', car_maintenance: 'תחזוקת רכב', family_general: 'משפחה',
  family_celebrations: 'שמחות במשפחה', work_event: 'אירוע בעבודה', holidays_religious: 'חגים וצרכי דת',
  charity: 'תרומות', pocket_money: 'דמי כיס', family_help: 'עזרה למשפחה',
  holiday_pesach: 'הוצאות פסח', holiday_sukkot: 'הוצאות סוכות',
  holiday_rosh_hashana: 'הוצאות ראש השנה', holiday_yom_kippur: 'הוצאות יום כיפור',
  holiday_chanuka: 'הוצאות חנוכה', holiday_purim: 'הוצאות פורים',
  holiday_shavuot: 'הוצאות שבועות', bein_hazmanim: 'הוצאות בין הזמנים',
  alimony_payment: 'תשלום מזונות', leisure_general: 'פנאי', entertainment: 'בילויים',
  restaurant: 'מסעדה', vacations: 'חופשות', pets: 'חיות מחמד', sports: 'ספורט',
  babysitter: 'בייביסיטר', lottery: 'הגרלות', adult_classes: 'חוגי מבוגרים',
  finance_general: 'פיננסים', savings_deposits: 'הפקדות לחיסכון', life_insurance: 'ביטוח חיים',
  national_insurance: 'ביטוח לאומי', commissions: 'עמלות', debt_repayment: 'החזר חובות',
  overdraft_interest: 'ריביות משיכת יתר', home_contents_general: 'תכולת בית',
  kitchenware: 'כלי בית', electronics: 'מוצרי חשמל', toys_books: 'צעצועים וספרים',
  furniture: 'ריהוט', communication_general: 'תקשורת', tv_internet: 'חדר מחשבים ואינטרנט',
  phone_mobile_landline: 'טלפון', content_services: 'שירותי תוכן', grooming_general: 'טיפוח',
  hairdresser: 'מספרה', cosmetics: 'קוסמטיקה', other_expense: 'אחר',
  baby_kids: 'תינוקות וילדים', judaica: 'יהדות ותשמישי קדושה', books_periodicals: 'ספרים, עיתונים ומנויים',
  photo_print: 'צילום והדפסות', advertising: 'פרסום ושיווק', transfers_out: 'העברות לאחרים',
  internal_transfer: 'העברות פנימיות', savings_transfer: 'העברה לחיסכון', maaser: 'מעשרות', cash: 'מזומן', to_clarify: 'לבירור',
};

// קטגוריות שאינן הוצאה בפועל — מוחרגות מסך ההוצאות
export const EXCLUDED_CATEGORIES = ['cash', 'internal_transfer', 'savings_transfer'];

export const INCOME_LABELS = {
  salary_general: 'שכר', salary_1: 'שכר עבודה 1', salary_2: 'שכר עבודה 2',
  benefits_general: 'קצבאות', rent_assistance: 'סיוע בשכר דירה', old_age_pension: 'קצבת זיקנה',
  child_benefit: 'קצבת ילדים', disability_benefit: 'קצבת נכות',
  misc_income_general: 'הכנסות שונות', property_income: 'הכנסה מנכס',
  parents_help: 'עזרה מההורים', alimony_received: 'קבלת מזונות', gifts_income: 'מתנות',
  refund_income: 'החזרים', business_income: 'הכנסה מעסק',
};

export function labelsFor(type) {
  return type === 'income' ? INCOME_LABELS : EXPENSE_LABELS;
}

export function labelOf(id, type) {
  return labelsFor(type)[id] || (type === 'income' ? 'הכנסה' : 'אחר');
}

// חיפוש קטגוריה לפי שם שהמשתמש אמר (התאמה מלאה או חלקית)
export function findCategoryByName(spoken, type) {
  const norm = String(spoken || '').replace(/[^\u0590-\u05FF a-zA-Z]/g, '').trim();
  if (!norm) return null;
  const labels = labelsFor(type);
  let best = null;
  let bestLen = 0;
  for (const id in labels) {
    const l = labels[id];
    if ((norm.includes(l) || l.includes(norm)) && l.length > bestLen) {
      best = id;
      bestLen = l.length;
    }
  }
  return best;
}