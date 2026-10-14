const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const { FileStore } = require("metro-cache");
const path = require("node:path");

const config = getDefaultConfig(__dirname);
config.cacheStores = [new FileStore({ root: path.join(__dirname, ".cache", "metro") })];
const cacheDirectory = path.join(__dirname, ".cache").replace(/[.*+?^$}{()|[\]\\]/g, "\\$&");
config.resolver.blockList = [].concat(config.resolver.blockList || [], new RegExp(cacheDirectory + "[\\\\/]"));

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  extraThemes: ["dark"],
});
