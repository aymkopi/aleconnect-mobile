import test from "node:test";
import assert from "node:assert/strict";
import {phoneUrl,websiteUrl,oncePerActivation} from "../src/features/hotlines/contact-actions.ts";
test("dialler boundary rejects unsafe contacts",()=>{
 assert.equal(phoneUrl("+63 917 123 4567"),"tel:+639171234567"); assert.equal(phoneUrl("911"),"tel:911");
 for(const s of ["*123#","abc","12","tel:911;foo"]) assert.equal(phoneUrl(s),null);
 assert.equal(websiteUrl("javascript:alert(1)"),null); assert.equal(websiteUrl("https://aleco.com.ph"),"https://aleco.com.ph/");
});
test("repeated completion opens once until reset",()=>{
 let calls=0; const activate=oncePerActivation(()=>calls++); activate.run();activate.run();assert.equal(calls,1);
 activate.reset();activate.run();assert.equal(calls,2);
});
