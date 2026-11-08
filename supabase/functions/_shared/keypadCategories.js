// בחירת קטגוריה באמצעות מקשי הטלפון — קבוצות ואחריהן קטגוריות (מותאם לבית חרדי)
export const EXPENSE_KEYPAD = [
  { label: 'מזון וקניות מכולת', items: ['groceries_weekly', 'grocery_local', 'fruits_vegetables', 'meat_poultry', 'fish', 'dairy', 'bakery', 'drinks_snacks', 'food'] },
  { label: 'שבת, חג ואוכל מוכן', items: ['shabbat_food', 'yom_tov_food', 'prepared_food', 'catering_events', 'kashrut_extra'] },
  { label: 'דיור ואחזקת בית', items: ['rent', 'mortgage', 'municipal_tax', 'electricity', 'water_sewage', 'gas', 'home_repairs', 'cleaning'] },
  { label: 'בריאות ופארמה', items: ['medications', 'dental', 'private_treatments', 'health_fund', 'optics', 'pharma_toiletries'] },
  { label: 'חינוך ומסגרות לילדים', items: ['school', 'education_general', 'day_care', 'babysitter_nanny', 'noon_care', 'summer_care', 'after_school_activities', 'school_transport', 'private_lesson'] },
  { label: 'תחבורה', items: ['public_transport', 'fuel', 'parking', 'car_insurance', 'car_maintenance', 'toll_roads'] },
  { label: 'משפחה, שמחות ותרומות', items: ['family_celebrations', 'charity', 'pocket_money', 'family_help'] },
  { label: 'חגים ובין הזמנים', items: ['holiday_pesach', 'holiday_sukkot', 'holiday_rosh_hashana', 'holiday_chanuka', 'holiday_purim', 'holiday_shavuot', 'bein_hazmanim', 'holidays_religious'] },
  { label: 'פיננסים וחובות', items: ['debt_repayment', 'savings_deposits', 'life_insurance', 'commissions', 'overdraft_interest'] },
  { label: 'ביגוד, תקשורת ותכולת בית', items: ['clothing_general', 'children_clothing', 'shoes', 'phone_mobile_landline', 'tv_internet', 'electronics', 'furniture', 'hairdresser', 'other_expense'] },
];

export const INCOME_KEYPAD = [
  { label: 'שכר', items: ['salary_general', 'salary_1', 'salary_2'] },
  { label: 'קצבאות וסיוע', items: ['child_benefit', 'old_age_pension', 'disability_benefit', 'rent_assistance'] },
  { label: 'הכנסות שונות', items: ['business_income', 'property_income', 'parents_help', 'gifts_income', 'refund_income', 'misc_income_general'] },
];

export function keypadGroups(type) {
  return type === 'income' ? INCOME_KEYPAD : EXPENSE_KEYPAD;
}