export const RATE_LIMIT_MESSAGE='Too many requests. Try again later.';
export function isRateLimit(status?:number,code?:string){return status===429||/RATE_LIMIT|TOO_MANY|ATTEMPTS_EXCEEDED/.test(code??'');}
