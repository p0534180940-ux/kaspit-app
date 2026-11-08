// תנועות שנרשמו לפני הוספת שדה הסטטוס נחשבות מאושרות
export function isConfirmed(t) {
  return (t?.status || 'confirmed') === 'confirmed';
}

export function onlyConfirmed(list) {
  return (list || []).filter(isConfirmed);
}