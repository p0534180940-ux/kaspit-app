import {
  ShoppingBasket, Home, Flame, Flower2, Zap, Droplets, Sparkles, Wrench, Users, Star, Heart, HeartHandshake, Shirt, Baby, Footprints, Eye, ShieldPlus, HeartPulse, Smile, Stethoscope, Pill, Building2, Shield, Landmark, Banknote, Key, Receipt, CreditCard, TrendingDown, School, Bus, Trophy, GraduationCap, BookOpen, Sun, Clock, PencilRuler, Scissors, SprayCan, Utensils, Cigarette, PartyPopper, Coins, Scale, PiggyBank, Percent, Wallet, Ticket, Gift, Plane, PawPrint, UtensilsCrossed, Dumbbell, Gamepad2, Car, Fuel, CircleParking, Route as Road, FileText, CarFront, Tv, Phone, Sofa, Package, Plus, MoreHorizontal, Briefcase, RotateCcw, Accessibility, PersonStanding, Megaphone, Camera, HelpCircle, ArrowLeftRight
} from 'lucide-react';

// קטגוריות שאינן הוצאה בפועל (משיכת מזומן, העברה לעצמי) — מוחרגות מסך ההוצאות בדוחות
export const EXCLUDED_CATEGORIES = ['cash', 'internal_transfer', 'savings_transfer'];
// קטגוריות תרומה שמקזזות את חשבון המעשרות
export const DONATION_CATEGORIES = ['charity', 'maaser'];
export const isDonation = (t) => t.type === 'expense' && (DONATION_CATEGORIES.includes(t.category) || /צדקה|מעשר|תרומ/.test(String(t.category).startsWith('custom:') ? t.category : ''));
export const isSpend = (t) => t.type === 'expense' && !EXCLUDED_CATEGORIES.includes(t.category);

export const EXPENSE_GROUPS = [
  { id: 'food', label: 'מזון ופארמה', icon: ShoppingBasket, color: '#0F6E6B' },
  { id: 'housing', label: 'דיור ואחזקת בית', icon: Home, color: '#B8893A' },
  { id: 'health', label: 'בריאות', icon: HeartPulse, color: '#E11D48' },
  { id: 'education', label: 'חינוך', icon: GraduationCap, color: '#5B6CFF' },
  { id: 'clothing', label: 'ביגוד והנעלה', icon: Shirt, color: '#7C3AED' },
  { id: 'transport', label: 'תחבורה', icon: Car, color: '#0891B2' },
  { id: 'family', label: 'משפחה ואירועים', icon: Users, color: '#DB2777' },
  { id: 'leisure', label: 'פנאי ובילויים', icon: Ticket, color: '#EA580C' },
  { id: 'finance', label: 'פיננסים וחובות', icon: Wallet, color: '#475569' },
  { id: 'home_contents', label: 'תכולת בית', icon: Sofa, color: '#9333EA' },
  { id: 'communication', label: 'תקשורת', icon: Phone, color: '#65A30D' },
  { id: 'grooming', label: 'טיפוח', icon: Scissors, color: '#C026D3' },
  { id: 'other_expense', label: 'אחר', icon: MoreHorizontal, color: '#64748B' },
];

export const INCOME_GROUPS = [
  { id: 'salary', label: 'שכר', icon: Wallet, color: '#2D8659' },
  { id: 'benefits', label: 'קצבאות וסיוע', icon: Landmark, color: '#5B6CFF' },
  { id: 'misc_income', label: 'הכנסות שונות', icon: Plus, color: '#65A30D' },
];

export const EXPENSE_CATEGORIES = [
  // מזון ופארמה
  { id: 'food', label: 'מזון', group: 'food', icon: ShoppingBasket, color: '#0F6E6B', keywords: ['מזון', 'סופר', 'רמי לוי', 'שופרסל', 'יינות ביתן', 'כלבית', 'מרכול', 'מכולת', 'אוכל', 'ירקות', 'פירות', 'קניות', 'מצרכים', 'לחם', 'חלב', 'ביצים', 'בשר', 'דגים', 'חטיפים', 'אושר עד', 'דלישס', 'ים שיווק'] },
  { id: 'prepared_food', label: 'אוכל מוכן / בעבודה', group: 'food', icon: Utensils, color: '#0F6E6B', keywords: ['אוכל מוכן', 'בעבודה', 'ארוחה', 'סנדוויץ', 'פלאפל', 'שווארמה', 'פיצה', 'המבורגר', 'מאפה', 'בורקס', 'גלידה', 'עץ התמר', 'מור וקינמון', 'קפוצ\'ינו'] },
  { id: 'drinks_snacks', label: 'שתייה וחטיפים', group: 'food', icon: ShoppingBasket, color: '#0F6E6B', keywords: ['שתייה', 'חטיפים', 'ממתקים'] },
  { id: 'bakery', label: 'מאפייה וחלות', group: 'food', icon: ShoppingBasket, color: '#0F6E6B', keywords: ['מאפייה', 'חלות', 'לחם'] },
  { id: 'water_bar', label: 'בר מים', group: 'food', icon: Droplets, color: '#0F6E6B', keywords: ['בר מים', 'מים מינרליים', 'בקבוקי מים'] },
  { id: 'food_pharma_general', label: 'מזון ופארמה - כללי', group: 'food', icon: ShoppingBasket, color: '#0F6E6B', keywords: ['מזון ופארמה'] },
  { id: 'smoking', label: 'עישון', group: 'food', icon: Cigarette, color: '#0F6E6B', keywords: ['עישון', 'סיגריות', 'סיגר', 'טבק', 'נרגילה'] },
  { id: 'pharma_toiletries', label: 'פארמה וטואלטיקה', group: 'food', icon: Pill, color: '#0F6E6B', keywords: ['פארמה', 'טואלטיקה', 'שמפו', 'סבון', 'משחת שיניים', 'טישו', 'מגבונים', 'טואלט'] },

  // דיור ואחזקת בית
  { id: 'rent', label: 'שכר דירה', group: 'housing', icon: Key, color: '#B8893A', keywords: ['שכר דירה', 'שכ"ד', 'שכד', 'דירה', 'שכירות'] },
  { id: 'mortgage', label: 'משכנתה', group: 'housing', icon: Banknote, color: '#B8893A', keywords: ['משכנתה', 'משכנתא'] },
  { id: 'municipal_tax', label: 'ארנונה', group: 'housing', icon: Receipt, color: '#B8893A', keywords: ['ארנונה', 'עירייה'] },
  { id: 'building_committee', label: 'מיסי ישוב / ועד בית', group: 'housing', icon: Building2, color: '#B8893A', keywords: ['ועד בית', 'מיסי ישוב', 'ועד הבית'] },
  { id: 'property_insurance', label: 'ביטוח נכס ותכולה', group: 'housing', icon: Shield, color: '#B8893A', keywords: ['ביטוח נכס', 'ביטוח דירה', 'ביטוח תכולה'] },
  { id: 'housing_general', label: 'דיור - כללי', group: 'housing', icon: Home, color: '#B8893A', keywords: ['דיור'] },
  { id: 'electricity', label: 'חשמל', group: 'housing', icon: Zap, color: '#B8893A', keywords: ['חשמל', 'חברת חשמל'] },
  { id: 'water_sewage', label: 'מים וביוב', group: 'housing', icon: Droplets, color: '#B8893A', keywords: ['מים וביוב', 'ביוב', 'תאגיד מים'] },
  { id: 'gas', label: 'גז', group: 'housing', icon: Flame, color: '#B8893A', keywords: ['גז', 'גז בישול'] },
  { id: 'garden', label: 'גינה', group: 'housing', icon: Flower2, color: '#B8893A', keywords: ['גינה', 'גן', 'צמחים', 'פרחים'] },
  { id: 'cleaning', label: 'ניקיון', group: 'housing', icon: SprayCan, color: '#B8893A', keywords: ['ניקיון', 'מנקה', 'עזרת בית', 'סדרן', 'מטלים'] },
  { id: 'home_repairs', label: 'תיקונים בבית / במכשירים', group: 'housing', icon: Wrench, color: '#B8893A', keywords: ['תיקון', 'תיקונים', 'שרברב', 'חשמלאי', 'בנאי', 'אינסטלטור'] },

  // בריאות
  { id: 'health_general', label: 'בריאות - כללי', group: 'health', icon: HeartPulse, color: '#E11D48', keywords: ['בריאות', 'רפואי'] },
  { id: 'optics', label: 'אופטיקה', group: 'health', icon: Eye, color: '#E11D48', keywords: ['אופטיקה', 'משקפיים', 'עדשות', 'אופטומטריה'] },
  { id: 'extra_medical_insurance', label: 'ביטוח רפואי נוסף', group: 'health', icon: ShieldPlus, color: '#E11D48', keywords: ['ביטוח רפואי', 'ביטוח משלים', 'מכבי זהב'] },
  { id: 'dental', label: 'טיפולי שיניים', group: 'health', icon: Smile, color: '#E11D48', keywords: ['שיניים', 'טיפולי שיניים', 'רופא שיניים', 'דנטיסט', 'שן'] },
  { id: 'private_treatments', label: 'טיפולים פרטיים', group: 'health', icon: Stethoscope, color: '#E11D48', keywords: ['טיפול פרטי', 'רופא פרטי', 'מרפאה', 'טיפולים פרטיים'] },
  { id: 'health_fund', label: 'קופ"ח תשלום קבוע', group: 'health', icon: HeartPulse, color: '#E11D48', keywords: ['קופ"ח', 'קופת חולים', 'מכבי', 'כללית', 'מאוחדת', 'לאומית', 'קופה'] },
  { id: 'medications', label: 'תרופות', group: 'health', icon: Pill, color: '#E11D48', keywords: ['תרופות', 'תרופה', 'בית מרקחת', 'פארם', 'מרשם'] },

  // חינוך
  { id: 'education_general', label: 'חינוך - כללי', group: 'education', icon: GraduationCap, color: '#5B6CFF', keywords: ['חינוך', 'שכר לימוד', 'שכ"ל'] },
  { id: 'school', label: 'בית ספר', group: 'education', icon: School, color: '#5B6CFF', keywords: ['בית ספר', 'תלמוד תורה', 'ישיבה', 'ישיבת', 'כולל', 'ת"ת', 'בימ"ק', 'בית נאמן', 'מרכז אלונים', 'משכן אלימלך'] },
  { id: 'school_transport', label: 'הסעות', group: 'education', icon: Bus, color: '#5B6CFF', keywords: ['הסעות', 'הסעה', 'הסעת'] },
  { id: 'after_school_activities', label: 'חוגים ותנועת נוער', group: 'education', icon: Trophy, color: '#5B6CFF', keywords: ['חוג', 'חוגים', 'תנועת נוער', 'בני עקיבא', 'אריאל'] },
  { id: 'adult_studies', label: 'לימודים והשתלמות לבוגרים', group: 'education', icon: BookOpen, color: '#5B6CFF', keywords: ['לימודים', 'השתלמות', 'קורס', 'תואר', 'מכון'] },
  { id: 'day_care', label: 'מסגרות יום', group: 'education', icon: Sun, color: '#5B6CFF', keywords: ['מסגרת יום', 'מעון', 'פעוטון'] },
  { id: 'noon_care', label: 'מסגרות צהריים', group: 'education', icon: Clock, color: '#5B6CFF', keywords: ['צהרון', 'מסגרת צהריים', 'צהרית'] },
  { id: 'summer_care', label: 'מסגרות קיץ', group: 'education', icon: Sun, color: '#5B6CFF', keywords: ['מסגרת קיץ', 'קייטנה'] },
  { id: 'babysitter_nanny', label: 'צהרון / מטפלת', group: 'education', icon: Baby, color: '#5B6CFF', keywords: ['מטפלת', 'בייביסיטר', 'שמרטף', 'מטפל'] },
  { id: 'private_lesson', label: 'שיעור פרטי', group: 'education', icon: PencilRuler, color: '#5B6CFF', keywords: ['שיעור פרטי', 'מורה פרטי', 'תגבור'] },

  // ביגוד והנעלה
  { id: 'clothing_general', label: 'ביגוד והנעלה - כללי', group: 'clothing', icon: Shirt, color: '#7C3AED', keywords: ['בגדים', 'ביגוד', 'הנעלה', 'חנות בגדים', 'בזאר שטראוס', 'קווין', 'לודמיר', 'FAMILY SOCKS', 'פאשן', 'סיגלית'] },
  { id: 'parents_clothing', label: 'ביגוד הורים', group: 'clothing', icon: Shirt, color: '#7C3AED', keywords: ['בגדים להורים', 'ביגוד הורים'] },
  { id: 'children_clothing', label: 'ביגוד ילדים', group: 'clothing', icon: Baby, color: '#7C3AED', keywords: ['בגדי ילדים', 'ביגוד ילדים', 'בגדי תינוק'] },
  { id: 'shoes', label: 'נעליים', group: 'clothing', icon: Footprints, color: '#7C3AED', keywords: ['נעליים', 'סנדלים', 'מגפיים', 'נעלי מרטי'] },

  // תחבורה
  { id: 'transport_general', label: 'תחבורה - כללי', group: 'transport', icon: Car, color: '#0891B2', keywords: ['תחבורה'] },
  { id: 'fuel', label: 'דלק', group: 'transport', icon: Fuel, color: '#0891B2', keywords: ['דלק', 'בנזין', 'פזורה', 'סונול', 'דור אלון'] },
  { id: 'car_insurance', label: 'ביטוח רכב', group: 'transport', icon: Shield, color: '#0891B2', keywords: ['ביטוח רכב', 'ביטוח חובה', 'ביטוח מקיף'] },
  { id: 'parking', label: 'חניה', group: 'transport', icon: CircleParking, color: '#0891B2', keywords: ['חניה', 'חניון', 'פקאל'] },
  { id: 'toll_roads', label: 'כבישי אגרה', group: 'transport', icon: Road, color: '#0891B2', keywords: ['כבישי אגרה', 'כביש 6', 'fast', 'פאסט'] },
  { id: 'leasing', label: 'ליסינג', group: 'transport', icon: Car, color: '#0891B2', keywords: ['ליסינג'] },
  { id: 'car_license', label: 'רישוי רכב', group: 'transport', icon: FileText, color: '#0891B2', keywords: ['רישוי', 'רישוי רכב'] },
  { id: 'public_transport', label: 'תחבורה ציבורית', group: 'transport', icon: Bus, color: '#0891B2', keywords: ['אוטובוס', 'רכבת', 'תחבורה ציבורית', 'מונית', 'אגד', 'ישראל רכבות', 'רב קו', 'דן חברה', 'תחבורה ציבו'] },
  { id: 'shared_transport', label: 'תחבורה שיתופית', group: 'transport', icon: CarFront, color: '#0891B2', keywords: ['תחבורה שיתופית', 'קארטו', 'שיתופית'] },
  { id: 'car_maintenance', label: 'תחזוקת רכב', group: 'transport', icon: Wrench, color: '#0891B2', keywords: ['תחזוקת רכב', 'טיפול רכב', 'מוסך', 'גלגל', 'טיפול'] },

  // משפחה ואירועים
  { id: 'family_general', label: 'משפחה - כללי', group: 'family', icon: Users, color: '#DB2777', keywords: ['משפחה'] },
  { id: 'family_celebrations', label: 'ארועי שמחות במשפחה', group: 'family', icon: PartyPopper, color: '#DB2777', keywords: ['שמחה', 'חתונה', 'ברית', 'בר מצווה', 'חינה', 'אירוע במשפחה', 'יומולדת', 'גומילידה', 'מתנה'] },
  { id: 'work_event', label: 'אירוע בעבודה / לחברים', group: 'family', icon: Users, color: '#DB2777', keywords: ['אירוע בעבודה', 'לחברים', 'מתנה לחבר'] },
  { id: 'holidays_religious', label: 'חגים וצרכי דת', group: 'family', icon: Star, color: '#DB2777', keywords: ['חג', 'חגים', 'צרכי דת', 'שבת', 'יום טוב', 'סוכה', 'מצות', 'לולב', 'חנוכייה', 'פורים', 'פסח', 'סליחות', 'ימים נוראים', 'שרותי דת'] },
  { id: 'charity', label: 'תרומות', group: 'family', icon: Heart, color: '#DB2777', keywords: ['צדקה', 'תרומה', 'תרומות', 'מעשר', 'כספי צדקה', 'חסד', 'מוסדות קבר רחל', 'מרכז הצדקה', 'למחייתם', 'בוני עולם'] },
  { id: 'pocket_money', label: 'דמי כיס', group: 'family', icon: Coins, color: '#DB2777', keywords: ['דמי כיס', 'כיס'] },
  { id: 'family_help', label: 'עזרה למשפחה', group: 'family', icon: HeartHandshake, color: '#DB2777', keywords: ['עזרה למשפחה', 'תמיכה'] },
  { id: 'alimony_payment', label: 'תשלום מזונות', group: 'family', icon: Scale, color: '#DB2777', keywords: ['מזונות', 'תשלום מזונות'] },

  // פנאי ובילויים
  { id: 'leisure_general', label: 'פנאי - כללי', group: 'leisure', icon: Gamepad2, color: '#EA580C', keywords: ['פנאי', 'בילויים'] },
  { id: 'entertainment', label: 'בילויים ומופעים', group: 'leisure', icon: Ticket, color: '#EA580C', keywords: ['בילוי', 'מופע', 'קולנוע', 'תיאטרון', 'כרטיס', 'סרט'] },
  { id: 'restaurant', label: 'מסעדה ואוכל בחוץ', group: 'leisure', icon: UtensilsCrossed, color: '#EA580C', keywords: ['מסעדה', 'אוכל בחוץ', 'בית קפה', 'קפה', 'ביסטרו'] },
  { id: 'vacations', label: 'חופשות', group: 'leisure', icon: Plane, color: '#EA580C', keywords: ['חופשה', 'מלון', 'נופש', 'צימר', 'טיול', 'אילת'] },
  { id: 'pets', label: 'חיות מחמד', group: 'leisure', icon: PawPrint, color: '#EA580C', keywords: ['חיות מחמד', 'כלב', 'חתול', 'אוכל לכלב', 'וטרינר', 'אוכל לחתול'] },
  { id: 'sports', label: 'ספורט', group: 'leisure', icon: Dumbbell, color: '#EA580C', keywords: ['ספורט', 'חדר כושר', 'כושר', 'בריכה', 'מגרש', 'כדור'] },
  { id: 'babysitter', label: 'בייביסיטר', group: 'leisure', icon: Baby, color: '#EA580C', keywords: ['בייביסיטר', 'שמרטף'] },
  { id: 'lottery', label: 'הגרלות', group: 'leisure', icon: Gift, color: '#EA580C', keywords: ['הגרלות', 'לוטו', 'צאנס', 'פיס'] },
  { id: 'adult_classes', label: 'חוגי מבוגרים', group: 'leisure', icon: Trophy, color: '#EA580C', keywords: ['חוג מבוגרים', 'חוג למבוגרים'] },

  // פיננסים וחובות
  { id: 'finance_general', label: 'פיננסים - כללי', group: 'finance', icon: Wallet, color: '#475569', keywords: ['פיננסים', 'בנק', 'מימוש זכויות', 'מיסים', 'תשלומים', 'שונות'] },
  { id: 'savings_deposits', label: 'הפקדות לחסכונות - כללי', group: 'finance', icon: PiggyBank, color: '#475569', keywords: ['הפקדה', 'חיסכון', 'חסכון', 'פיקדון', 'קרן השתלמות', 'הפקדת', 'תקבולים', 'נ"ע', 'ני"ע', 'פדיון', 'משיכת פיקדון'] },
  { id: 'life_insurance', label: 'ביטוח חיים', group: 'finance', icon: Shield, color: '#475569', keywords: ['ביטוח חיים', 'ביטוח פנסיוני', 'פנסיה'] },
  { id: 'national_insurance', label: 'ביטוח לאומי', group: 'finance', icon: Landmark, color: '#475569', keywords: ['ביטוח לאומי', 'ביטוח לאומי'] },
  { id: 'commissions', label: 'עמלות', group: 'finance', icon: Percent, color: '#475569', keywords: ['עמלה', 'עמלות', 'אגרה', 'אגרות', 'עמלת', 'דמי כרטיס', 'פועלים- דמי'] },
  { id: 'debt_repayment', label: 'החזר חובות חודשי', group: 'finance', icon: CreditCard, color: '#475569', keywords: ['החזר חוב', 'החזר חובות', 'חוב', 'פרעון'] },
  { id: 'overdraft_interest', label: 'ריביות משיכת יתר', group: 'finance', icon: TrendingDown, color: '#475569', keywords: ['ריבית', 'משיכת יתר', 'overdraft', 'יתרון', 'ריביות'] },

  // תכולת בית
  { id: 'home_contents_general', label: 'תכולת בית - כללי', group: 'home_contents', icon: Package, color: '#9333EA', keywords: ['תכולת בית'] },
  { id: 'kitchenware', label: 'כלי בית', group: 'home_contents', icon: Utensils, color: '#9333EA', keywords: ['כלי בית', 'כלי מטבח', 'סירים', 'מטבח'] },
  { id: 'electronics', label: 'מוצרי חשמל ואלקטרוניקה', group: 'home_contents', icon: Tv, color: '#9333EA', keywords: ['מוצרי חשמל', 'אלקטרוניקה', 'טלוויזיה', 'מחשב', 'מקרר', 'מכונת כביסה', 'מצלמה'] },
  { id: 'toys_books', label: 'משחקים, צעצועים וספרים', group: 'home_contents', icon: Gamepad2, color: '#9333EA', keywords: ['משחקים', 'צעצועים', 'ספרים', 'ספר', 'משחק', 'פאזל', 'מגזין', 'השגחה פרטית', 'שבועון', 'ביתרבייבי'] },
  { id: 'furniture', label: 'ריהוט', group: 'home_contents', icon: Sofa, color: '#9333EA', keywords: ['ריהוט', 'שולחן', 'כיסא', 'מיטה', 'ארון', 'ספה', 'מזרון'] },

  // תקשורת
  { id: 'communication_general', label: 'תקשורת - כללי', group: 'communication', icon: Phone, color: '#65A30D', keywords: ['תקשורת'] },
  { id: 'tv_internet', label: 'טלויזיה ואינטרנט', group: 'communication', icon: Tv, color: '#65A30D', keywords: ['טלויזיה', 'אינטרנט', 'כבלים', 'yes', 'הוט', 'בזק', 'ספקית'] },
  { id: 'phone_mobile_landline', label: 'טלפון נייד ונייח', group: 'communication', icon: Phone, color: '#65A30D', keywords: ['טלפון', 'סלולר', 'פלאפון', 'סלקום', 'אורנג', 'נייח', 'סלולרי'] },
  { id: 'content_services', label: 'שירותי תוכן', group: 'communication', icon: FileText, color: '#65A30D', keywords: ['שירותי תוכן', 'נטפליקס', 'דיסני', 'פריים', 'ספוטיפיי', 'מנוי', 'פילטר', 'לינקנט', 'מבט', 'נטפרי', 'תרגימא'] },

  // טיפוח
  { id: 'grooming_general', label: 'טיפוח - כללי', group: 'grooming', icon: Scissors, color: '#C026D3', keywords: ['טיפוח'] },
  { id: 'hairdresser', label: 'מספרה', group: 'grooming', icon: Scissors, color: '#C026D3', keywords: ['מספרה', 'תספורת', 'מספר'] },
  { id: 'cosmetics', label: 'קוסמטיקה', group: 'grooming', icon: SprayCan, color: '#C026D3', keywords: ['קוסמטיקה', 'איפור', 'מייקאפ', 'בושם', 'פרפום', 'יופי', 'אופנה', 'גולדן קרים', 'מכון שי', 'ננה אייץ', 'רויאל רוז', 'מיכל'] },

  // קטגוריות לייבוא וסיווג אוטומטי
  { id: 'baby_kids', label: 'תינוקות וילדים', group: 'family', icon: Baby, color: '#DB2777', keywords: ['תינוק', 'עגלות', 'בייבי', 'baby'] },
  { id: 'judaica', label: 'יהדות ותשמישי קדושה', group: 'family', icon: Star, color: '#DB2777', keywords: ['תכלת', 'ציצית', 'תפילין', 'סתם', 'יודאיקה'] },
  { id: 'books_periodicals', label: 'ספרים, עיתונים ומנויים', group: 'home_contents', icon: BookOpen, color: '#9333EA', keywords: ['שבועון', 'עיתון', 'ירחון'] },
  { id: 'photo_print', label: 'צילום והדפסות', group: 'home_contents', icon: Camera, color: '#9333EA', keywords: ['צילום', 'הדפסה', 'פוטו'] },
  { id: 'advertising', label: 'פרסום ושיווק', group: 'finance', icon: Megaphone, color: '#475569', keywords: ['פרסום', 'מודעות'] },
  { id: 'transfers_out', label: 'העברות לאחרים', group: 'finance', icon: ArrowLeftRight, color: '#475569', keywords: ['העברה לאחרים'] },
  { id: 'internal_transfer', label: 'העברות פנימיות (לא הוצאה)', group: 'finance', icon: ArrowLeftRight, color: '#94A3B8', keywords: ['העברה לעצמי'] },
  { id: 'savings_transfer', label: 'העברה לחיסכון (לא הוצאה)', group: 'finance', icon: PiggyBank, color: '#94A3B8', keywords: ['העברה לחיסכון'] },
  { id: 'maaser', label: 'מעשרות', group: 'family', icon: Heart, color: '#DB2777', keywords: ['מעשרות', 'מעשר כספים'] },
  { id: 'cash', label: 'מזומן (לא הוצאה)', group: 'finance', icon: Banknote, color: '#94A3B8', keywords: ['משיכת מזומן', 'כספומט'] },
  { id: 'to_clarify', label: 'לבירור', group: 'other_expense', icon: HelpCircle, color: '#64748B', keywords: [] },
  // אחר
  { id: 'other_expense', label: 'אחר', group: 'other_expense', icon: MoreHorizontal, color: '#64748B', keywords: ['שילמתי', 'קניתי', 'קנייה', 'שילם'] },
];

export const INCOME_CATEGORIES = [
  // שכר
  { id: 'salary_general', label: 'שכר - כללי', group: 'salary', icon: Wallet, color: '#2D8659', keywords: ['משכורת', 'שכר עבודה', 'שכר', 'תלוש', 'משכורת חודשית'] },
  { id: 'salary_1', label: 'שכר עבודה עיקרי', group: 'salary', icon: Wallet, color: '#2D8659', keywords: ['שכר עבודה עיקרי', 'משכורת ראשית'] },
  { id: 'salary_2', label: 'שכר עבודה נוסף', group: 'salary', icon: Briefcase, color: '#2D8659', keywords: ['שכר עבודה נוסף', 'עבודה נוספת', 'משכורת שנייה'] },
  { id: 'salary_3', label: 'שעות נוספות ובונוסים', group: 'salary', icon: Coins, color: '#2D8659', keywords: ['שעות נוספות', 'בונוס', 'מענק', 'הבראה', 'ביגוד'] },
  { id: 'salary_4', label: 'הכנסה מעבודה עצמאית', group: 'salary', icon: Briefcase, color: '#2D8659', keywords: ['עצמאי', 'פרילנס', 'עבודה עצמאית'] },
  { id: 'kollel_stipend', label: 'כולל / מלגה', group: 'salary', icon: BookOpen, color: '#2D8659', keywords: ['כולל', 'מלגה', 'מלגת', 'אברך'] },

  // קצבאות וסיוע
  { id: 'benefits_general', label: 'קצבאות - כללי', group: 'benefits', icon: Landmark, color: '#5B6CFF', keywords: ['קצבאות', 'קצבה'] },
  { id: 'rent_assistance', label: 'סיוע בשכר דירה', group: 'benefits', icon: Home, color: '#5B6CFF', keywords: ['סיוע בשכר דירה', 'סיוע בדיור'] },
  { id: 'old_age_pension', label: 'קצבת זיקנה', group: 'benefits', icon: PersonStanding, color: '#5B6CFF', keywords: ['קצבת זיקנה', 'זקנה'] },
  { id: 'child_benefit', label: 'קצבת ילדים', group: 'benefits', icon: Baby, color: '#5B6CFF', keywords: ['דמי ילדים', 'קצבת ילדים', 'ילדים'] },
  { id: 'disability_benefit', label: 'קצבת נכות', group: 'benefits', icon: Accessibility, color: '#5B6CFF', keywords: ['קצבת נכות', 'נכות'] },

  // הכנסות שונות
  { id: 'misc_income_general', label: 'הכנסות שונות - כללי', group: 'misc_income', icon: Plus, color: '#65A30D', keywords: ['הכנסות שונות', 'הכנסה', 'הכנסות', 'קיבלתי', 'מזומן'] },
  { id: 'property_income', label: 'שכירות דירה / הכנסה מנכס', group: 'misc_income', icon: Building2, color: '#65A30D', keywords: ['הכנסה מנכס', 'דמי שכירות', 'שכירות דירה', 'שכר דירה שקיבלתי'] },
  { id: 'tax_refund', label: 'החזר מס', group: 'misc_income', icon: Receipt, color: '#65A30D', keywords: ['החזר מס', 'תיאום מס', 'מס הכנסה'] },
  { id: 'investment_income', label: 'הכנסה מהשקעות וחסכונות', group: 'misc_income', icon: PiggyBank, color: '#65A30D', keywords: ['השקעות', 'ריבית שהתקבלה', 'דיבידנד', 'פדיון חיסכון'] },
  { id: 'loan_received', label: 'הלוואה / גמ"ח שהתקבל', group: 'misc_income', icon: Landmark, color: '#65A30D', keywords: ['הלוואה', 'גמח', 'גמ"ח', 'הלוואה שהתקבלה'] },
  { id: 'sale_income', label: 'מכירת פריטים', group: 'misc_income', icon: Package, color: '#65A30D', keywords: ['מכרתי', 'מכירת פריט', 'יד שנייה'] },
  { id: 'parents_help', label: 'עזרה מההורים', group: 'misc_income', icon: HeartHandshake, color: '#65A30D', keywords: ['עזרה מההורים', 'מההורים', 'הורים'] },
  { id: 'alimony_received', label: 'קבלת מזונות', group: 'misc_income', icon: Scale, color: '#65A30D', keywords: ['קבלת מזונות'] },
  { id: 'gifts_income', label: 'מתנות', group: 'misc_income', icon: Gift, color: '#65A30D', keywords: ['מתנה', 'מתנות', 'קיבלתי מתנה'] },
  { id: 'refund_income', label: 'החזרים', group: 'misc_income', icon: RotateCcw, color: '#65A30D', keywords: ['החזר', 'החזרים', 'החזר כספי'] },
  { id: 'business_income', label: 'עסק', group: 'misc_income', icon: Briefcase, color: '#65A30D', keywords: ['עסק', 'מכירה', 'הכנסה מעסק'] },
];

export const MIGRATION_MAP = {
  groceries: 'food',
  groceries_weekly: 'food',
  utilities: 'electricity',
  education: 'education_general',
  health: 'health_general',
  clothing: 'clothing_general',
  transport: 'transport_general',
  celebrations: 'family_celebrations',
  phone: 'phone_mobile_landline',
  insurance: 'life_insurance',
  household: 'home_contents_general',
  salary: 'salary_general',
  business: 'business_income',
  benefits: 'benefits_general',
  child_allowance: 'child_benefit',
  refund: 'refund_income',
  savings: 'savings_deposits',
  other_income: 'misc_income_general',
};

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function getCategory(id) {
  const mappedId = MIGRATION_MAP[id] || id;
  const found = ALL_CATEGORIES.find((c) => c.id === mappedId);
  if (found) return found;
  // קטגוריה אישית שהמשתמש יצר בטלפון: מוצגת בשמה
  const custom = String(id || '').startsWith('custom:') ? String(id).slice(7).trim() : '';
  // אין תווית עברית — מציגים "אחר" ולא את המפתח הפנימי
  return { id, label: custom || 'אחר', icon: MoreHorizontal, color: '#64748B' };
}

// מפתח קיבוץ לדוחות: קטגוריה מוכרת נשארת, קטגוריה אישית נשארת בשמה, כל השאר נכנס ל"אחר"
export function breakdownKey(id) {
  const mapped = MIGRATION_MAP[id] || id;
  if (String(mapped).startsWith('custom:')) return mapped;
  return ALL_CATEGORIES.some((c) => c.id === mapped) ? mapped : 'other_expense';
}

export function getCategoriesByType(type) {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function getGroupedCategories(type) {
  const groups = type === 'income' ? INCOME_GROUPS : EXPENSE_GROUPS;
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return groups.map((group) => ({
    ...group,
    categories: categories.filter((c) => c.group === group.id),
  })).filter((g) => g.categories.length > 0);
}