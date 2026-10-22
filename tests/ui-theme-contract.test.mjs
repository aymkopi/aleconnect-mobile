import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
test("ALEConnect defines semantic PanelUI light/dark surfaces and contrast",async()=>{
 const css=await readFile(new URL("../theme.css",import.meta.url),"utf8");
 const global=await readFile(new URL("../global.css",import.meta.url),"utf8");
 assert.match(global,/@import "\.\/theme.css"/); assert.match(css,/@variant light/);assert.match(css,/@variant dark/);
 for(const token of ["background","foreground","primary","primary-foreground","muted-foreground","card","border","destructive"]) assert.ok(css.split("--color-"+token+":").length>=4,token);
 const get=theme=>Object.fromEntries([...css.match(new RegExp("@variant "+theme+" \\{([\\s\\S]*?)\\n    \\}"))[1].matchAll(/--color-([\w-]+):\s*(#[\da-fA-F]{6});/g)].map(m=>[m[1],m[2]]));
 const luminance=hex=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722;};
 for(const theme of ["light","dark"]){const t=get(theme);for(const [text,bg] of [["foreground","background"],["muted-foreground","card"],["primary-foreground","primary"],["destructive-solid-foreground","destructive"]]){const a=luminance(t[text]),b=luminance(t[bg]);assert.ok((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)>=4.5,theme+" "+text);}}
});
test("every exposed app color token exists in both supported native themes", async () => {
  const hook = await readFile(new URL("../src/hooks/use-app-colors.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../theme.css", import.meta.url), "utf8");
  const tokens = [...hook.slice(hook.indexOf("export type AppColorToken"), hook.indexOf("export function")).matchAll(/"([\w-]+)"/g)].map(m=>m[1]);
  for (const theme of ["light","dark"]) {
    const block = css.match(new RegExp("@variant "+theme+" \\{([\\s\\S]*?)\\n    \\}"))[1];
    for (const token of tokens) assert.ok(block.includes("--color-"+token+":"), theme+" missing "+token);
  }
});

test("dark surfaces derive from the near-black anchor and text remains readable across every surface",async()=>{
 const css=await readFile(new URL("../theme.css",import.meta.url),"utf8");
 for(const theme of ["dark","moon-dark","grass-dark"]){
 const block=css.match(new RegExp("@variant "+theme+" \\{([\\s\\S]*?)\\n    \\}"))[1];
 const t=Object.fromEntries([...block.matchAll(/--color-([\w-]+):\s*(#[\da-fA-F]{6});/g)].map(m=>[m[1],m[2].toUpperCase()]));
 const mix=a=>"#"+[0,6,15].map(c=>Math.round(c+(255-c)*a).toString(16).padStart(2,"0")).join("").toUpperCase();
 for(const [token,amount]of Object.entries({background:0,card:.08,popover:.10,overlay:.14,secondary:.14,muted:.16,border:.20,input:.14,surface:.08,"surface-secondary":.10,"surface-tertiary":.14,feature:.10}))assert.equal(t[token],mix(amount),token);
 assert.equal(t.foreground,"#FFFFFF");
 const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
 const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 for(const surface of ["background","card","popover","overlay","secondary","muted","feature"])for(const text of ["foreground","muted-foreground","primary"])assert.ok(contrast(t[text],t[surface])>=4.5,text+" on "+surface);
 assert.ok(contrast(t.control,t.card)>=3,"unchecked control contrast");
 }
});

test("primary-filled app controls use the theme's contrasting icon and label colors", async () => {
 for (const [path,icon] of [["auth/sign-in-screen.tsx","IdentityIcon"],["reports/new-report-screen.tsx","Check"],["profile/accounts-screen.tsx","LinkIcon"]]) {
  const source=await readFile(new URL("../src/features/"+path,import.meta.url),"utf8");
  assert.match(source,new RegExp('<'+icon+' size=\\{\\d+\\} color=\\{primaryForeground\\}'),path);
 }
 const signIn=await readFile(new URL("../src/features/auth/sign-in-screen.tsx",import.meta.url),"utf8");
 assert.match(signIn,/style=\{\[styles.action, \{ color: primaryForeground \}\]\}/);
});


test("border-free field text and focus indicators contrast with Light/Dark filled surfaces",async()=>{
 const css=await readFile(new URL("../theme.css",import.meta.url),"utf8");
 const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
 const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 for(const theme of ["light","dark"]){
  const block=css.split("@variant "+theme+" {")[1].split("\n    }")[0];
  const t=Object.fromEntries([...block.matchAll(/--color-([\w-]+):\s*(#[\da-fA-F]{6});/g)].map(m=>[m[1],m[2]]));
  for(const surface of ["card","popover","input","muted"]){
   assert.ok(contrast(t.foreground,t[surface])>=4.5,theme+" field text");
   assert.ok(contrast(t["muted-foreground"],t[surface])>=4.5,theme+" field hint");
   assert.ok(contrast(t.ring,t[surface])>=3,theme+" functional focus");
  }
 }
});


test("every sheet theme separates contact cards and keeps labels and controls readable",async()=>{
 const css=await readFile(new URL("../theme.css",import.meta.url),"utf8");
 const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
 const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 for(const theme of ["light","dark","moon","moon-dark","grass","grass-dark"]){
  const block=css.split("@variant "+theme+" {")[1].split("\n    }")[0];
  const t=Object.fromEntries([...block.matchAll(/--color-([\w-]+):\s*(#[\da-fA-F]{6});/g)].map(m=>[m[1],m[2].toUpperCase()]));
  assert.equal(t["sheet-surface"],theme.endsWith("dark")?"#1A1F27":"#EFF2F6",theme+" sheet standard");
  assert.notEqual(t["sheet-surface"],t.card,theme+" card surface separation");
  for(const text of ["foreground","muted-foreground"])for(const bg of ["sheet-surface","card"])assert.ok(contrast(t[text],t[bg])>=4.5,theme+" "+text+" on "+bg);
  assert.ok(contrast(t["primary-foreground"],t.primary)>=4.5,theme+" call control");
 }
});
