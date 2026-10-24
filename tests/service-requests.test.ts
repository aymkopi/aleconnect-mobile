import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import { normalizeServiceRequestKinds, selectServiceRequest, serviceRequestDateError, assertServiceRequestReceipt, normalizeServiceRequestProgress } from '../src/features/services/service-request-contract.ts';
import {initialComplaintForm} from '../src/features/reports/data.ts';
import {reportDetails,validateReportForm} from '../src/features/reports/contract.ts';
const type={id:'t',categoryId:'c',title:'Temporary Lighting'};
const kind={kind:'lighting',typeId:'t',categoryId:'c',requirements:['ALECO account','Location','Required report details','1–3 photos']};
test('temporary requests do not direct consumers to the new-connection requirements',async()=>{
 const source=await readFile(new URL('../src/features/services/service-info-screen.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(source.split('export function ServiceRequestScreen()')[1],/newconnection\.html|Official forms and requirements/);
 assert.match(source.split('export function ServiceRequestScreen()')[0],/newconnection\.html/);
});
test('supported preselection follows current metadata, while old and unsupported metadata stay unavailable',()=>{
 assert.deepEqual(normalizeServiceRequestKinds(undefined,[type]),[]);
 const kinds=normalizeServiceRequestKinds([kind],[type]);assert.equal(selectServiceRequest(kinds,'lighting')?.typeId,'t');assert.equal(selectServiceRequest(kinds,'disconnection'),null);
 assert.deepEqual(normalizeServiceRequestKinds([{...kind,typeId:'foreign'}],[type]),[]);
 assert.deepEqual(normalizeServiceRequestKinds([kind,kind],[type]),[]);
});
test('optional requested date has Philippine calendar validation and never acts as a confirmed schedule',()=>{
 const now=new Date('2026-10-23T17:00:00Z');assert.equal(serviceRequestDateError('',now),null);assert.equal(serviceRequestDateError('2026-10-24',now),null);
 for(const value of ['2026-02-30','2026-10-23','tomorrow'])assert.ok(serviceRequestDateError(value,now));
});
test('new request receipt must retain the original kind/date; old queue entries need no extension',()=>{
 assert.doesNotThrow(()=>assertServiceRequestReceipt(undefined,{ticketId:'ticket'}));
 const original={kind:'lighting',requestedDate:'2026-11-01'};
 assert.doesNotThrow(()=>assertServiceRequestReceipt(original,{serviceRequest:original}));
 for(const receipt of [{},{serviceRequest:{...original,kind:'disconnection'}},{serviceRequest:{...original,requestedDate:null}}])assert.throws(()=>assertServiceRequestReceipt(original,receipt));
});
test('old detail payloads stay compatible and requirement progress remains separate from canonical status',()=>{
 assert.equal(normalizeServiceRequestProgress(undefined),null);
 const value={kind:'lighting',requestedDate:'2026-11-01',confirmedSchedule:'2026-11-02T01:00:00Z',version:2,requirements:kind.requirements.map(label=>({label,received:true})),missingRequirementNote:'',updatedAt:'2026-10-24T02:00:00Z'};
 assert.equal(normalizeServiceRequestProgress(value)?.requestedDate,'2026-11-01');assert.equal(normalizeServiceRequestProgress({...value,confirmedSchedule:'bad'}),null);
});
test('service requests retain the version-one report shape and normal account, location and evidence validation',()=>{
 assert.deepEqual(reportDetails(initialComplaintForm),{version:1,categoryDescription:null,typeDescription:null,kwhmTransfer:null});
 const form={...initialComplaintForm,serviceRequestKind:'lighting' as const,requestedServiceDate:'2099-01-02'};
 assert.deepEqual(reportDetails(form),{...reportDetails(initialComplaintForm),serviceRequest:{kind:'lighting',requestedDate:'2099-01-02'}});
 const original=validateReportForm(initialComplaintForm,undefined,undefined,{barangays:[]});
 const service=validateReportForm(form,undefined,undefined,{barangays:[]});
 assert.deepEqual(service,original);assert.ok(service.accountNumber);assert.ok(service.location);assert.ok(service.evidence);
 assert.ok(validateReportForm({...form,requestedServiceDate:'2000-01-01'},undefined,undefined,{barangays:[]}).requestedServiceDate);
});
