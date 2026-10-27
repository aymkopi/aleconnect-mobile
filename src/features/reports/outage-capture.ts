import {serviceStatusScopeKey,type OutageScope,type ServiceStatus,type OutageItem} from '../home/service-status-contract.ts';

export function outageCaptureKey(draftId:string,sessionId:string,scope:OutageScope){
 return JSON.stringify([draftId,sessionId,serviceStatusScopeKey(scope)]);
}

export function createOutageCapture(read:(scope:OutageScope,signal:AbortSignal)=>Promise<ServiceStatus>,budgetMs=10000){
 let current:{key:string;controller:AbortController;promise:Promise<ServiceStatus>}|null=null;
 return {
  read(key:string,scope:OutageScope){
   if(current?.key===key)return current.promise;
   current?.controller.abort();
   const controller=new AbortController();
   const promise=new Promise<ServiceStatus>(resolve=>{
    const timer=setTimeout(()=>{controller.abort();resolve({enabled:false});},budgetMs);
    Promise.resolve().then(()=>read(scope,controller.signal)).then(resolve,()=>resolve({enabled:false})).finally(()=>clearTimeout(timer));
   });
   current={key,controller,promise};return promise;
  },
  invalidate(key:string){if(current?.key===key){current.controller.abort();current=null;}}
 };
}

export function matchingOutageNotices(status:ServiceStatus|null,now=Date.now()){
 return status?.enabled&&!status.isStale?status.items.filter(item=>item.state==='active'&&!outageNoticeExpired(item,now)).slice(0,3):[];
}

export function outageNoticeExpired(item:OutageItem,now=Date.now()){
 const day=item.outageDate??item.occurrenceDate;
 const deadlines=[item.scheduledEndAt,item.expiresAt].filter((value):value is string=>!!value).map(Date.parse);
 if(!item.scheduledEndAt&&day)deadlines.push(Date.parse(day+'T00:00:00+08:00')+86400000);
 return deadlines.some(at=>Number.isFinite(at)&&at<=now);
}
