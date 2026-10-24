export type ServiceRequestKind = 'lighting' | 'disconnection';
export type ServiceRequestInput = { kind: ServiceRequestKind; requestedDate: string | null };
export type ServiceRequestKindMetadata = { kind: ServiceRequestKind; typeId: string; categoryId: string; requirements: string[] };
export type ServiceRequestProgress = ServiceRequestInput & { version: number; requirements: {label: string;received: boolean}[]; missingRequirementNote: string; confirmedSchedule: string | null; updatedAt: string };
function record(value: unknown): value is Record<string,unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function kind(value: unknown): value is ServiceRequestKind { return value === 'lighting' || value === 'disconnection'; }
function validDate(value: string) { const date=new Date(`${value}T00:00:00Z`);return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===value; }
export function normalizeServiceRequestKinds(value: unknown, types: readonly {id: string;categoryId: string}[]): ServiceRequestKindMetadata[] {
  if (!Array.isArray(value)) return [];
  const valid=value.filter((item): item is ServiceRequestKindMetadata => record(item) && kind(item.kind) && typeof item.typeId === 'string' && typeof item.categoryId === 'string' && types.some(type=>type.id===item.typeId && type.categoryId===item.categoryId) && Array.isArray(item.requirements) && item.requirements.length===4 && item.requirements.every(label=>typeof label==='string' && label.trim().length>0 && label.length<=150));
  return valid.filter(item=>valid.filter(other=>other.kind===item.kind || other.typeId===item.typeId).length===1);
}
export function selectServiceRequest(kinds: readonly ServiceRequestKindMetadata[], selected: unknown) { return kinds.find(item=>item.kind===selected) ?? null; }
export function serviceRequestDateError(value: string, now=new Date()) {
  if (!value) return null;
  if (!validDate(value)) return 'Choose a valid requested date.';
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  return value < today ? 'Choose today or a later requested date.' : null;
}
export function assertServiceRequestReceipt(original: unknown, receipt: unknown) {
  if (original === undefined || original === null) return;
  const saved=record(receipt) && record(receipt.serviceRequest) ? receipt.serviceRequest : null;
  if (!record(original) || !saved || saved.kind!==original.kind || (saved.requestedDate??null)!==(original.requestedDate??null)) throw new Error('The server did not confirm the service-request details. Keep this saved submission and refresh before retrying.');
}
export function normalizeServiceRequestProgress(value: unknown): ServiceRequestProgress | null {
  if (!record(value) || !kind(value.kind) || !Number.isSafeInteger(value.version) || Number(value.version)<1 || (value.requestedDate!==null && (typeof value.requestedDate!=='string' || !validDate(value.requestedDate))) || !Array.isArray(value.requirements) || value.requirements.length!==4 || !value.requirements.every(item=>record(item) && typeof item.label==='string' && item.label.length>0 && item.label.length<=150 && typeof item.received==='boolean') || typeof value.missingRequirementNote!=='string' || value.missingRequirementNote.length>1000 || typeof value.updatedAt!=='string' || !Number.isFinite(Date.parse(value.updatedAt)) || (value.confirmedSchedule!==null && (typeof value.confirmedSchedule!=='string' || !Number.isFinite(Date.parse(value.confirmedSchedule))))) return null;
  return value as ServiceRequestProgress;
}
