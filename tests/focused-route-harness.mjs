import { readFile } from 'node:fs/promises';

export const CHILD_STATE = Symbol('CHILD_STATE');
const exports = {};
const source = await readFile(new URL('../node_modules/expo-router/build/react-navigation/core/getFocusedRouteNameFromRoute.js', import.meta.url), 'utf8');
new Function('require', 'exports', source)(() => ({ CHILD_STATE }), exports);
export const getFocusedRouteNameFromRoute = exports.getFocusedRouteNameFromRoute;
