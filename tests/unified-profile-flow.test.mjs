import test from "node:test";
import assert from "node:assert/strict";
import { profileEditor, nodes, field, button } from "./helpers/profile-editor.mjs";

const photo = { id: "selected", uri: "file://new.jpg" };
const settle = () => new Promise(resolve => setImmediate(resolve));
function review(f) { button(f.render(), "Review changes").props.onPress(); return f.render(); }
async function saveDetails(f) {
  const tree = review(f); assert.equal(field(tree, "Current ALECO account password"), undefined);
  button(tree, "Save changes").props.onPress(); await settle(); return f.render();
}
test("unified editor shows avatar controls and the selected service email, never the identity email", async t => {
  const f = await profileEditor(t), tree = (await f.start());
  assert.equal(field(tree, "Service account email").props.value, "home@example.com");
  assert.equal(field(tree, "Service account email").props.editable, true);
  assert.ok(field(tree, "Contact number"));
  assert.ok(button(tree, "Change location"));
  assert.ok(nodes(tree).find(n => n.props?.accessibilityLabel === "Change profile photo"));
  assert.deepEqual(tree.props.image.crop.aspect, [1, 1]);
  const heading = nodes(tree).find(n => n.type === "Heading");
  assert.equal(heading.props.title, "Test Person");
  assert.equal(heading.props.description, "222");
  assert.equal(heading.props.onChangeText, undefined);
  tree.props.onValueChange([photo]);
  const clear = nodes(f.render()).find(n => n.props?.accessibilityLabel === "Clear selected photo");
  clear.props.onPress();
  assert.deepEqual(f.render().props.value, []);
  assert.equal(field(f.render(), "Service account email").props.value, "home@example.com");
  assert.equal(f.calls.length, 0);
});
test("photo-only save compresses, keeps the selected account/session, and prevents duplicate saves", async t => {
  let finish; const compression = new Promise(resolve => { finish = resolve; });
  const f = await profileEditor(t, { compress: () => compression });
  (await f.start()).props.onValueChange([photo]);
  const tree = review(f); assert.equal(field(tree, "Current ALECO account password"), undefined);
  const first = button(tree, "Save photo").props.onPress(); button(tree, "Save photo").props.onPress();
  await settle(); finish(new ArrayBuffer(4)); await first; await settle();
  assert.equal(f.calls.filter(c => c[0] === "details").length, 0);
  const uploads = f.calls.filter(c => c[0] === "photo"); assert.equal(uploads.length, 1);
  assert.deepEqual(uploads[0][2], { serviceAccountId: "service-b", accessRevision: 7 });
  assert.equal(uploads[0][3], "pinned-session");
  assert.ok(nodes(f.render()).some(n => n.props?.title === "Profile updated"));
});
test("service email updates use the explicit service field with the scoped entry proof", async t => {
  const f = await profileEditor(t); field((await f.start()), "Service account email").props.onChangeText(" NEW@example.com ");
  await saveDetails(f); const call = f.calls.find(c => c[0] === "details");
  assert.deepEqual(call[1], { serviceAccountEmail: "new@example.com" });
  assert.equal(call[2], ""); assert.equal(call[4], "pinned-session"); assert.equal(call[5], "profile-proof");
});

test("profile fields and photo picker stay unavailable until current-password verification succeeds", async t => {
  const f = await profileEditor(t);
  button(f.render(), "Edit profile").props.onPress();
  const gate = f.render();
  assert.equal(field(gate, "Contact number"), undefined);
  assert.equal(button(gate, "Change location"), undefined);
  assert.equal(gate.props.disabled, true);
  const tree = await f.verify();
  assert.ok(field(tree, "Contact number"));
  const verify = f.verificationCalls.find(call => call.body.action === "verify");
  assert.equal(verify.body.currentPassword, "sign-in-secret");
  assert.equal(verify.authToken, "pinned-session");
});

test("incorrect entry password is cleared and cannot open the editor", async t => {
  const f = await profileEditor(t, { verificationError: "Current password is incorrect." });
  const tree = await f.start();
  assert.equal(field(tree, "Contact number"), undefined);
  const gate = nodes(tree).find(n => n.props?.verification);
  assert.equal(gate.props.verification.password, "");
  assert.equal(gate.props.verification.error, "Current password is incorrect.");
  assert.equal(f.calls.length, 0);
});

test("expired server verification retains drafts and asks for confirmation before retry", async t => {
  const options = {};
  const f = await profileEditor(t, options);
  options.detailsError = new f.ApiRequestError("Verification expired.", "CURRENT_PASSWORD_VERIFICATION_REQUIRED");
  field(await f.start(), "Contact number").props.onChangeText("09181234567");
  f.render().props.onValueChange([photo]);
  const blocked = await saveDetails(f);
  assert.equal(nodes(blocked).find(n => n.type === "Page").props.title, "Edit profile");
  assert.equal(field(blocked, "Contact number"), undefined);
  assert.equal(blocked.props.value[0].uri, photo.uri);
  assert.equal(f.calls.filter(c => c[0] === "photo").length, 0);
  options.detailsError = null;
  const restored = await f.verify();
  assert.equal(button(restored, "Save changes")?.props.children, "Save changes");
  button(restored, "Save changes").props.onPress(); await settle();
  assert.equal(f.calls.filter(c => c[0] === "details").at(-1)[1].phone, "09181234567");
  assert.equal(f.calls.filter(c => c[0] === "photo").length, 1);
});
test("a photo failure after details commit preserves the photo and retries only its upload", async t => {
  const f = await profileEditor(t, { photoError: true });
  let tree = (await f.start()); field(tree, "Contact number").props.onChangeText("09181234567");
  f.render().props.onValueChange([photo]); tree = await saveDetails(f);
  assert.ok(nodes(tree).some(n => n.props?.description?.startsWith("Details saved. Your photo was not updated.")));
  assert.equal(tree.props.value[0].uri, photo.uri);
  tree = review(f); assert.equal(field(tree, "Current ALECO account password"), undefined);
  button(tree, "Save photo").props.onPress(); await settle();
  assert.equal(f.calls.filter(c => c[0] === "details").length, 1);
  assert.equal(f.calls.filter(c => c[0] === "photo").length, 2);
});
test("failed detail save does not upload a photo or discard pending changes", async t => {
  const f = await profileEditor(t, { detailsError: "Temporarily unavailable" });
  field((await f.start()), "Contact number").props.onChangeText("09181234567"); f.render().props.onValueChange([photo]);
  const tree = await saveDetails(f);
  assert.equal(f.calls.filter(c => c[0] === "photo").length, 0);
  assert.equal(field(tree, "Current ALECO account password"), undefined);
  assert.equal(tree.props.value[0].uri, photo.uri);
});
test("compression finishing after account invalidation cannot upload", async t => {
  let finish; const compression = new Promise(resolve => { finish = resolve; });
  const f = await profileEditor(t, { compress: () => compression }); (await f.start()).props.onValueChange([photo]);
  const pending = button(review(f), "Save photo").props.onPress();
  await settle(); f.setCurrent(false); finish(new ArrayBuffer(4)); await pending; await settle();
  assert.equal(f.calls.filter(c => ["photo", "details"].includes(c[0])).length, 0);
});
test("legacy identity responses cannot expose a sign-in email as editable service-account data", async t => {
  const f = await profileEditor(t, { profile: { serviceAccountEmail: undefined, serviceAccountEmailEditable: undefined,
    emailEditable: false } });
  const email = field((await f.start()), "Service account email");
  assert.equal(email.props.value, ""); assert.equal(email.props.editable, false);
});
test("photo-only drafts participate in the discard dialog", async t => {
  const f = await profileEditor(t); (await f.start()).props.onValueChange([photo]);
  nodes(f.render()).find(n => n.type === "Page").props.onBack();
  assert.ok(nodes(f.render()).some(n => n.props?.open === true));
  button(f.render(), "Discard changes").props.onPress();
  assert.deepEqual(f.render().props.value, []);
});

test("a late picker result from a discarded draft cannot overwrite the next editor", async t => {
  const f = await profileEditor(t);
  const oldCallback = (await f.start()).props.onValueChange;
  oldCallback([photo]);
  nodes(f.render()).find(n => n.type === "Page").props.onBack();
  button(f.render(), "Discard changes").props.onPress();
  (await f.start()).props.onValueChange([{ id: "new-draft", uri: "file://new-draft.jpg" }]);
  oldCallback([{ id: "late", uri: "file://previous-draft.jpg" }]);
  assert.equal(f.render().props.value[0].uri, "file://new-draft.jpg");
});
