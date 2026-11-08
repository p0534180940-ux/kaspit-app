export const YEMOT_SYSTEM_NUMBER = '0737064079';
export const YEMOT_API_BASE = 'https://www.call2all.co.il/ym/api/';

// שלוחות הקלטה (קולי / הקשה)
export const RECORD_BRANCHES = [
  {
    path: '1',
    flow: 'identify',
    label: 'זיהוי אישי',
    prompt: 'אנא הקליטו את שמכם, או הקישו את מספר הזיהוי שלכם.',
  },
  {
    path: '2',
    flow: 'expense',
    label: 'רישום הוצאה',
    prompt: 'אנא הקליטו את ההוצאה. לדוגמה: מאה שקל ברמי לוי. להקשה — הקישו סכום ואז סוג הוצאה.',
  },
  {
    path: '3',
    flow: 'income',
    label: 'רישום הכנסה',
    prompt: 'אנא הקליטו את ההכנסה. לדוגמה: קיבלתי אלף שקל בכולל. להקשה — הקישו סכום ואז סוג הכנסה.',
  },
];

// שלוחות השמעה/דיווח (ללא הקלטה)
export const INFO_BRANCHES = [
  { path: '4', label: 'שמיעת נתונים', desc: 'השמעת סיכום הוצאות והכנסות לחודש הנוכחי' },
  { path: '5', label: 'דוחות', desc: 'שליחת דוח חודשי למייל / השמעת סיכום מפורט' },
];