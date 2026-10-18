import test from "node:test";
import assert from "node:assert/strict";
import { profileEditor, nodes, field, button } from "./helpers/profile-editor.mjs";

const photo = { id: "selected", uri: "file://new.jpg" };
const settle = () => new Promise(resolve => setImmediate(resolve));
function review(f) { button(f.render(), "Review changes").props.onPress(); return f.render(); }
async function saveDetails(f) {
  let tree = review(f); field(tree, "Current ALECO account password").props.onChangeText("service-secret");
  tree = f.render(); button(tree, "Verify & save").props.onPress(); await settle(); return f.render();
}
test("unified editor shows avatar controls and the selected service email, never the identity email", async t => {
  const f = await profileEditor(t), tree = f.start();
  assert.equal(field(tree, "Service account email").props.value, "home@example.com");
  assert.equal(field(tree, "Service account email").props.editable, true);
  assert.ok(field(tree, "Contact number"));
  assert.ok(button(tree, "Change location"));
  assert.ok(nodes(tree).find(n => n.props?.accessibilityLabel === "Change profile photo"));
  assert.deepEqual(tree.props.image.crop.aspect, [1, 1]);
  assert.ok(nodes(f.render()).some(n => n.props?.title === "Update your profile"));
});
test("photo-only save compresses, keeps the selected account/session, and prevents duplicate saves", async t => {
  let finish; const compression = new Promise(resolve => { finish = resolve; });
  const f = await profileEditor(t, { compress: () => compression });
  f.start().props.onValueChange([photo]);
  const tree = review(f); assert.equal(field(tree, "Current ALECO account password"), undefined);
  const first = button(tree, "Save photo").props.onPress(); button(tree, "Save photo").props.onPress();
  await settle(); finish(new ArrayBuffer(4)); await first; await settle();
  assert.equal(f.calls.filter(c => c[0] === "details").length, 0);
  const uploads = f.calls.filter(c => c[0] === "photo"); assert.equal(uploads.length, 1);
  assert.deepEqual(uploads[0][2], { serviceAccountId: "service-b", accessRevision: 7 });
  assert.equal(uploads[0][3], "pinned-session");
  assert.ok(nodes(f.render()).some(n => n.props?.title === "Profile updated"));
});
test("service email updates use the explicit service field with the selected ALECO password", async t => {
  const f = await profileEditor(t); field(f.start(), "Service account email").props.onChangeText(" NEW@example.com ");
  await saveDetails(f); const call = f.calls.find(c => c[0] === "details");
  assert.deepEqual(call[1], { serviceAccountEmail: "new@example.com" });
  assert.equal(call[2], "service-secret"); assert.equal(call[4], "pinned-session");
});
test("a photo failure after details commit preserves the photo and retries only its upload", async t => {
  const f = await profileEditor(t, { photoError: true });
  let tree = f.start(); field(tree, "Contact number").props.onChangeText("09181234567");
  f.render().props.onValueChange([photo]); tree = await saveDetails(f);
  assert.ok(nodes(tree).some(n => n.props?.description?.startsWith("Details saved. Your photo was not updated.")));
  assert.equal(tree.props.value[0].uri, photo.uri);
  tree = review(f); assert.equal(field(tree, "Current ALECO account password"), undefined);
  button(tree, "Save photo").props.onPress(); await settle();
  assert.equal(f.calls.filter(c => c[0] === "details").length, 1);
  assert.equal(f.calls.filter(c => c[0] === "photo").length, 2);
});
test("wrong detail password does not upload a photo or discard pending changes", async t => {
  const f = await profileEditor(t, { detailsError: "Incorrect password" });
  field(f.start(), "Contact number").props.onChangeText("09181234567"); f.render().props.onValueChange([photo]);
  const tree = await saveDetails(f);
  assert.equal(f.calls.filter(c => c[0] === "photo").length, 0);
  assert.equal(field(tree, "Current ALECO account password").props.value, "");
  assert.equal(tree.props.value[0].uri, photo.uri);
});
test("compression finishing after account invalidation cannot upload", async t => {
  let finish; const compression = new Promise(resolve => { finish = resolve; });
  const f = await profileEditor(t, { compress: () => compression }); f.start().props.onValueChange([photo]);
  const pending = button(review(f), "Save photo").props.onPress();
  await settle(); f.setCurrent(false); finish(new ArrayBuffer(4)); await pending; await settle();
  assert.equal(f.calls.filter(c => ["photo", "details"].includes(c[0])).length, 0);
});
test("legacy identity responses cannot expose a sign-in email as editable service-account data", async t => {
  const f = await profileEditor(t, { profile: { serviceAccountEmail: undefined, serviceAccountEmailEditable: undefined,
    emailEditable: false } });
  const email = field(f.start(), "Service account email");
  assert.equal(email.props.value, ""); assert.equal(email.props.editable, false);
});
test("photo-only drafts participate in the discard dialog", async t => {
  const f = await profileEditor(t); f.start().props.onValueChange([photo]);
  nodes(f.render()).find(n => n.type === "Page").props.onBack();
  assert.ok(nodes(f.render()).some(n => n.props?.open === true));
  button(f.render(), "Discard changes").props.onPress();
  assert.deepEqual(f.render().props.value, []);
});

test("a late picker result from a discarded draft cannot overwrite the next editor", async t => {
  const f = await profileEditor(t);
  const oldCallback = f.start().props.onValueChange;
  oldCallback([photo]);
  nodes(f.render()).find(n => n.type === "Page").props.onBack();
  button(f.render(), "Discard changes").props.onPress();
  f.start().props.onValueChange([{ id: "new-draft", uri: "file://new-draft.jpg" }]);
  oldCallback([{ id: "late", uri: "file://previous-draft.jpg" }]);
  assert.equal(f.render().props.value[0].uri, "file://new-draft.jpg");
});
