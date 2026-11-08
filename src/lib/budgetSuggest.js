// הצעת תקציב חודשי לפי תשובות האשף. הערכה גסה בלבד: המשתמש רואה ומשנה הכול לפני שמירה.
const PRICEY_CITIES = ['תל אביב', 'ירושלים', 'רמת גן', 'גבעתיים', 'הרצליה', 'רעננה', 'כפר סבא', 'חיפה', 'בני ברק', 'פתח תקווה', 'רחובות', 'נתניה', 'אשדוד', 'מודיעין'];

export const DEFAULT_ANSWERS = {
  persons: 4, kids03: 1, kids412: 1, kids13: 0, income: '', housing: 'rent', housingAmount: '', car: false, city: '',
};

const round10 = (n) => Math.round(n / 10) * 10;

export function suggestBudget(a) {
  const kids = a.kids03 + a.kids412 + a.kids13;
  const P = Math.max(1, a.persons);
  const adults = Math.max(1, P - kids);
  const school = a.kids412 + a.kids13;
  const income = Number(a.income) || 0;
  const housing = Number(a.housingAmount) || 0;
  const bigCity = PRICEY_CITIES.some((c) => a.city.includes(c));

  const flex = {
    food: 750 * P,
    pharma_toiletries: 60 * P,
    prepared_food: 40 * adults,
    municipal_tax: bigCity ? 450 : 330,
    electricity: 200 + 25 * P,
    water_sewage: 80 + 10 * P,
    gas: 60,
    building_committee: 100,
    home_repairs: 100,
    medications: 40 * P,
    private_treatments: 100,
    school: 350 * school,
    day_care: 600 * a.kids03,
    school_transport: 100 * school,
    children_clothing: 120 * kids,
    parents_clothing: 150 * adults,
    holidays_religious: 400,
    charity: round10(income * 0.02),
    family_celebrations: 150,
    phone_mobile_landline: 60 * adults,
    tv_internet: 80,
    life_insurance: 150 * adults,
    property_insurance: 60,
    leisure_general: 150,
    pocket_money: 30 * a.kids13,
  };
  if (a.car) Object.assign(flex, { fuel: 600, car_insurance: 350, car_maintenance: 250, car_license: 100, parking: 50 });
  else flex.public_transport = 80 * adults + 40 * a.kids13;

  const savings = round10(income * 0.05);
  const available = income - housing - savings;
  const total = Object.values(flex).reduce((s, v) => s + v, 0);
  const scale = total > 0 ? Math.min(1, Math.max(0.35, available / total)) : 1;

  const expense = {};
  for (const [id, v] of Object.entries(flex)) {
    const r = round10(v * scale);
    if (r > 0) expense[id] = r;
  }
  if (housing > 0) expense[a.housing === 'mortgage' ? 'mortgage' : 'rent'] = housing;
  if (savings > 0) expense.savings_deposits = savings;

  const warnings = [];
  if (scale < 0.7) warnings.push('ההכנסה נמוכה יחסית להוצאות הצפויות, ולכן הסכומים קוצצו. כדאי לעבור עליהם בעיון.');
  if (income > 0 && housing > income * 0.4) warnings.push('עלות הדיור גבוהה מ-40% מההכנסה.');
  return { income: { salary_general: income }, expense, warnings };
}