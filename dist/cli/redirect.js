#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redirect_1 = __importDefault(require("../core/redirect"));
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv)).argv;
const SPREADSHEET_ID = argv["spreadsheet-id"];
const SHEET_ID = argv["sheet-id"];
const OUTPUT_FILE = argv["output-file"];
const GOOGLE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_ID}`;
(0, redirect_1.default)({ googleSheetUrl: GOOGLE_SHEET_URL, outputFile: OUTPUT_FILE });
