// ייעוץ כלכלי לדוחות, לפי מודל כספית (base44/shared/kaspitModel.js):
// אבחון מבוסס כלכלה התנהגותית + צעדי פעולה + צעד יזום אחד לחודש הבא. פלט ענייני, בסגנון פלט מערכת.
import { diagnose, nextSteps, proactiveStep } from './kaspitModel.js';

export function buildAdvice(r) {
  return diagnose(r).map((f) => f.text);
}

export function adviceToHtml(r) {
  const findings = diagnose(r);
  const steps = nextSteps(r);
  if (!findings.length) return '';
  return `<h3>ניתוח והמלצות — מודל כספית</h3>
    <ol style="padding-inline-start:18px;margin:0 0 10px">${findings
      .map((f) => `<li style="margin-bottom:6px">${f.text}</li>`)
      .join('')}</ol>
    <h4 style="margin:0 0 4px">צעדים לחודש הקרוב</h4>
    <ul style="padding-inline-start:18px;margin:0 0 10px">${steps.map((s) => `<li>${s}</li>`).join('')}</ul>
    <h4 style="margin:0 0 4px">צעד יזום לחודש הבא</h4>
    <p style="margin:0">${proactiveStep(r)}</p>`;
}

export function adviceToText(r) {
  const findings = diagnose(r);
  const steps = nextSteps(r);
  if (!findings.length) return '';
  return [
    '',
    'ניתוח והמלצות — מודל כספית:',
    ...findings.map((f, i) => `${i + 1}. ${f.text}`),
    '',
    'צעדים לחודש הקרוב:',
    ...steps.map((s) => `- ${s}`),
    '',
    'צעד יזום לחודש הבא:',
    proactiveStep(r),
  ].join('\n');
}

// נוסח להקראה בטלפון (בלי קיצורים כמו ש"ח)
export function adviceToSpeech(r) {
  return proactiveStep(r).replace(/ ש"ח/g, ' שקלים').replace(/-/g, ' ');
}