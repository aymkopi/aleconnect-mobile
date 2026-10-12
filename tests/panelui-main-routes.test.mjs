import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
test("five canonical tabs retain profile URL",async()=>{
 const src=await readFile(new URL("../src/app/(tabs)/_layout.tsx",import.meta.url),"utf8");
 assert.deepEqual([...src.matchAll(/<Tabs.Screen\s+name="([^"]+)"/g)].map(x=>x[1]),["home","reports","advisories","hotlines","profile"]);
 assert.ok(!(await readdir(new URL("../src/app/",import.meta.url))).includes("advisories.tsx"));
});
test("one PanelUI root retains guarded queue",async()=>{
 const root=await readFile(new URL("../src/app/_layout.tsx",import.meta.url),"utf8");
 assert.match(root,/<PanelUIProvider>/); assert.doesNotMatch(root,/GluestackUIProvider|TextHost.defaultProps|<GestureHandlerRootView|<KeyboardProvider/);
 assert.match(root,/syncEnabled={!PANELUI_PREVIEW}/);
});
