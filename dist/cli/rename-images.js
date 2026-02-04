#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const rename_image_1 = require("../core/rename-image");
const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .option("input", {
    alias: "i",
    type: "string",
    demandOption: true,
    describe: "Input folder",
})
    .option("output", {
    alias: "o",
    type: "string",
    demandOption: true,
    describe: "Output folder",
})
    .strict()
    .parseSync();
const INPUT_DIR = path_1.default.resolve(argv.input);
const OUTPUT_DIR = path_1.default.resolve(argv.output);
(0, rename_image_1.processSVGs)(INPUT_DIR, OUTPUT_DIR);
console.log("✅ Rename images done");
console.log("📂 Input :", INPUT_DIR);
console.log("📁 Output:", OUTPUT_DIR);
