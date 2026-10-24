export type ReminderOccurrence={id:string;date:string;kind:'date_only'|'point'|'interval';startTime:string|null;endDate:string|null;endTime:string|null;status:'scheduled'|'cancelled';cancellationReason:string|null};
export function normalizeReminderOccurrences(value:unknown):ReminderOccurrence[]{
 if(!Array.isArray(value))return [];
 return value.slice(0,100).flatMap(row=>{
  if(!row || typeof row!=='object' || typeof row.id!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !['date_only','point','interval'].includes(row.kind) || !['scheduled','cancelled'].includes(row.status))return [];
  const time=(v:unknown)=>typeof v==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)?v:null;
  return [{id:row.id,date:row.date,kind:row.kind,startTime:time(row.startTime),endDate:typeof row.endDate==='string'?row.endDate:null,endTime:time(row.endTime),status:row.status,cancellationReason:typeof row.cancellationReason==='string'?row.cancellationReason:null}];
 });
}
export function reminderAvailability(row:ReminderOccurrence,now=Date.now()){
 if(row.status==='cancelled')return 'cancelled';
 if(row.kind==='date_only' || !row.startTime)return 'date_only';
 const start=Date.parse(`${row.date}T${row.startTime}:00+08:00`);
 return row.kind!=='interval' || !Number.isFinite(start)?'unavailable':start-now>3_600_000?'available':'too_late';
}
