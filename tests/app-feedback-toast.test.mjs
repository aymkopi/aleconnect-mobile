import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
test("global feedback uses one PanelUI toast viewport with lifecycle cleanup",async()=>{
 const root=await readFile(new URL("../src/app/_layout.tsx",import.meta.url),"utf8");
 const provider=await readFile(new URL("../src/components/panelui/panel-ui-provider.tsx",import.meta.url),"utf8");
 assert.match(root,/components\/panelui\/toast/);
 assert.equal((root.match(/toast\.show\(\{/g)??[]).length,3);
 assert.match(root,/handleForegroundNotification/);
 assert.match(root,/subscribeComplaintSubmissionToast/);
 assert.match(root,/unsubscribe\(\)/);
 assert.match(root,/numberOfLines=\{2\}/);
 assert.equal((provider.match(/<ToastViewport/g)??[]).length,1);
 assert.doesNotMatch(root,/Gluestack|setToast\(/);
});
