const path = require("node:path");
const Module = require("node:module");

const repositoryRoot = path.resolve(__dirname, "..");
const mobileRoot = path.join(repositoryRoot, "apps", "mobile");
const mobileModules = path.join(mobileRoot, "node_modules");

process.env.NODE_PATH = [mobileModules, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
Module._initPaths();
process.chdir(mobileRoot);
process.argv = [process.execPath, "expo", "customize", "tsconfig.json"];
require(require.resolve("expo/bin/cli", { paths: [mobileRoot] }));
