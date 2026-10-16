export const columns = [
  { key:'todo', label:'À postuler', status:'À préparer', icon:'file' },
  { key:'sent', label:'Envoyée', status:'Envoyée', icon:'send' },
  { key:'interview', label:'Entretien', status:'Entretien', icon:'calendar' },
  { key:'offer', label:'Offre', status:'Offre', icon:'check' }
];
export function columnOf(record) {
  return ({'Envoyée':'sent','Entretien':'interview','Offre':'offer','Refusée':'closed'})[record.status] || 'todo';
}
export function isArchived(record) { return Boolean(record.archived) || record.status === 'Refusée'; }
export function weekCount(records, today) {
  const monday = new Date(today+'T12:00:00Z');
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay()+6)%7);
  const start = monday.toISOString().slice(0,10);
  return records.filter(r => r.applied_date && r.applied_date >= start && r.applied_date <= today).length;
}
export function addDays(day, count) {
  const date = new Date(day+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()+count);
  return date.toISOString().slice(0,10);
}
export function transition(record, status, today) {
  const next = structuredClone(record);
  next.status = status;
  if (status === 'Envoyée' && !next.applied_date) {
    next.applied_date = today;
    next.follow_up_date ||= addDays(today,10);
  }
  if (status !== record.status) next.history = [...(record.history || []), {date:today, action:status === 'Refusée' ? 'Candidature archivée' : `Statut : ${status}`}];
  return next;
}
