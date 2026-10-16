import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const local = new URL('../src/components/panelui/', import.meta.url);
const sourcePath = process.env.PANELUI_FILE_UPLOAD_SOURCE;
const corePath = process.env.PANELUI_FILE_UPLOAD_CORE;
const compile = (source, require, extra = '') => {
  const exports = {};
  new Function('require', 'exports', '__DEV__', ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText + extra)(require, exports, false);
  return exports;
};
const core = compile(readFileSync(corePath ?? new URL('file-upload-core.ts', local), 'utf8'), () => ({}));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const asset = (name = 'photo.jpg') => ({ uri: `file:///${name}`, fileName: name, mimeType: 'image/jpeg', fileSize: 100, width: 100, height: 100 });
const result = (name) => ({ canceled: false, assets: [asset(name)] });
const existing = { id: 'existing', uri: 'file:///existing.jpg', name: 'existing.jpg', mimeType: 'image/jpeg', kind: 'image', status: 'idle' };

function harness({ picker = {}, manipulator } = {}) {
  let cursor = 0, context, props;
  const slots = [], effects = [], changes = [], errors = [], rejected = [];
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    forwardRef: (fn) => fn,
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useContext: () => context,
    useRef: (value) => { const index = cursor++; return slots[index] ?? (slots[index] = { current: value }); },
    useState: (value) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof value === 'function' ? value() : value;
      return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useEffect: (fn, deps) => {
      const index = cursor++;
      if (!slots[index] || !deps?.every((dep, i) => Object.is(dep, slots[index].deps[i]))) {
        effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: fn() }; });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const controllable = { useControllableState: ({ value, defaultValue, onChange }) => {
    const [internal, setInternal] = react.useState(defaultValue);
    return { value: value ?? internal, setValue(next) { if (value === undefined) setInternal(next); onChange?.(next); } };
  } };
  const modules = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Image: 'Image', ScrollView: 'ScrollView', AccessibilityInfo: { announceForAccessibility() {} } },
    'react-native-reanimated': { __esModule: true, default: { createAnimatedComponent: (value) => value } },
    'react-native-svg': { __esModule: true, default: 'Svg', Circle: 'Circle' },
    'tailwind-variants': { tv: () => () => ({}) },
    uniwind: { useCSSVariable: () => '#123456' },
    'expo-image-picker': picker,
    'expo-image-manipulator': manipulator,
    './file-upload-core': core,
  };
  const exports = compile(readFileSync(sourcePath ?? new URL('file-upload.tsx', local), 'utf8'), (id) => {
    if (id in modules) return modules[id];
    if (id.endsWith('/controllable-state')) return controllable;
    if (id.endsWith('/animated-pressable')) return { AnimatedPressable: 'AnimatedPressable' };
    if (id.endsWith('/cn')) return { cn: (...values) => values.filter(Boolean).join(' ') };
    if (id.endsWith('/field')) return { useFieldLabelledBy() {} };
    if (id.endsWith('/text')) return { Text: 'Text' };
    if (id.endsWith('/image-viewer')) return { ImageViewer: Object.assign('ImageViewer', { Trigger: 'ImageViewer.Trigger' }) };
    if (id.endsWith('/icons')) return {};
    if (id.endsWith('/attachment')) return { Attachment: Object.fromEntries(['Media', 'Content', 'Title', 'Description', 'Actions', 'Action'].map((part) => [part, `Attachment.${part}`])) };
    if (id.endsWith('/menu')) return {};
    throw new Error(`Unexpected FileUpload import: ${id}`);
  }, '\nexports.gridTileForTest = GridTile;');
  return {
    changes, errors, rejected,
    render(next = props ?? {}) {
      props = next;
      cursor = 0;
      context = exports.FileUpload({ onValueChange: (files) => changes.push(files), onError: (error) => errors.push(error), onReject: (files) => rejected.push(files), sources: ['library'], accept: ['image/*'], ...props }).props.value;
      while (effects.length) effects.shift()();
      return context;
    },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
    tile(file) { return exports.gridTileForTest({ file, size: 88, cover: false, radius: 12 }); },
    item(file) { return exports.FileUpload.Item({ file }); },
  };
}

test('library permits exact image/video MIME types and extensions', () => {
  for (const accept of [['image/png'], ['.png'], ['.webp'], [' IMAGE/HEIC ']]) assert.deepEqual(core.libraryMediaTypes(accept), ['images']);
  for (const accept of [['video/quicktime'], ['.mov']]) assert.deepEqual(core.libraryMediaTypes(accept), ['videos']);
  assert.deepEqual(core.libraryMediaTypes(['application/pdf']), []);
  assert.deepEqual(core.libraryMediaTypes(['*/*']), ['images', 'videos']);
});

test('a picker result cannot update an unmounted upload field', async () => {
  const pending = deferred();
  const h = harness({ picker: { launchImageLibraryAsync: () => pending.promise } });
  const picking = h.render().pick('library');
  h.unmount();
  pending.resolve(result());
  await picking;
  assert.equal(h.changes.length, 0);
});

test('disabling and reenabling invalidates the pending picker result', async () => {
  const pending = deferred();
  const h = harness({ picker: { launchImageLibraryAsync: () => pending.promise } });
  const picking = h.render().pick('library');
  h.render({ disabled: true });
  h.render({ disabled: false });
  pending.resolve(result());
  await picking;
  assert.equal(h.changes.length, 0);
});

test('clear invalidates a pending picker without resurrecting files', async () => {
  const pending = deferred();
  const h = harness({ picker: { launchImageLibraryAsync: () => pending.promise } });
  const context = h.render();
  const picking = context.pick('library');
  context.clear();
  pending.resolve(result());
  await picking;
  assert.deepEqual(h.changes, [[]]);
});

test('late camera permission does not open a picker after unmount', async () => {
  const pending = deferred();
  let launches = 0;
  const h = harness({ picker: { requestCameraPermissionsAsync: () => pending.promise, launchCameraAsync: async () => { launches++; return result(); } } });
  const picking = h.render().pick('camera');
  h.unmount();
  pending.resolve({ granted: true });
  await picking;
  assert.equal(launches, 0);
});

test('rapid picks open one system picker and respect the file count', async () => {
  const pending = deferred();
  let launches = 0;
  const h = harness({ picker: { launchImageLibraryAsync: () => { launches++; return pending.promise; } } });
  const context = h.render({ multiple: true, maxFiles: 1 });
  const first = context.pick('library'), second = context.pick('library');
  pending.resolve(result());
  await Promise.all([first, second]);
  assert.equal(launches, 1);
  assert.equal(h.changes.at(-1).length, 1);
});

test('the final count check includes controlled files added while the picker was open', async () => {
  const pending = deferred();
  const h = harness({ picker: { launchImageLibraryAsync: () => pending.promise } });
  const picking = h.render({ value: [], multiple: true, maxFiles: 1 }).pick('library');
  h.render({ value: [existing], multiple: true, maxFiles: 1 });
  pending.resolve(result());
  await picking;
  assert.equal(h.changes.length, 0);
  assert.equal(h.rejected[0][0].reason, 'count');
});

test('single-file selection replaces the current file', async () => {
  const h = harness({ picker: { launchImageLibraryAsync: async () => result('replacement.jpg') } });
  await h.render({ value: [existing] }).pick('library');
  assert.equal(h.changes.at(-1).length, 1);
  assert.equal(h.changes.at(-1)[0].name, 'replacement.jpg');
});

test('picker errors remain visible while mounted and are ignored after unmount', async () => {
  const failure = new Error('picker unavailable');
  const h = harness({ picker: { launchImageLibraryAsync: async () => { throw failure; } } });
  await h.render().pick('library');
  assert.equal(h.errors[0], failure);
  const pending = deferred();
  const late = harness({ picker: { launchImageLibraryAsync: () => pending.promise } });
  const picking = late.render().pick('library');
  late.unmount();
  pending.reject(failure);
  await picking;
  assert.equal(late.errors.length, 0);
});

test('Grid removes app-owned processing files instead of canceling a nonexistent upload', () => {
  const file = { ...existing, status: 'processing' };
  const h = harness();
  h.render({ value: [file] });
  const action = h.tile(file).props.children.at(-1);
  assert.equal(action.props.accessibilityLabel, 'Remove existing.jpg');
  action.props.onPress();
  assert.deepEqual(h.changes.at(-1), []);
});

test('List removes app-owned processing files and real upload actions retain cancel', () => {
  const file = { ...existing, status: 'processing' };
  const h = harness();
  h.render({ value: [file] });
  const action = h.item(file).props.children.at(-1).props.children.at(-1);
  assert.equal(action.props.accessibilityLabel, 'Remove existing.jpg');
  action.props.onPress();
  assert.deepEqual(h.changes.at(-1), []);
  h.render({ value: [file], upload: async () => {} });
  const cancel = h.tile(file).props.children.at(-1);
  assert.equal(cancel.props.accessibilityLabel, 'Cancel upload of existing.jpg');
  cancel.props.onPress();
  assert.equal(h.changes.at(-1)[0].status, 'canceled');
});

test('upstream resizing leaves size unknown, so app preparation must enforce the final byte limit', async () => {
  const h = harness({
    picker: { launchImageLibraryAsync: async () => result() },
    manipulator: { ImageManipulator: { manipulate: () => ({ resize() { return this; }, renderAsync: async () => ({ saveAsync: async () => ({ uri: 'file:///resized.jpg', width: 50, height: 50 }) }) }) } },
  });
  await h.render({ maxSize: 10, image: { maxWidth: 50 } }).pick('library');
  assert.equal(h.changes.at(-1)[0].size, undefined);
  assert.equal(h.rejected.length, 0);
});
