#!/usr/bin/env node
import convertGoogleSheetToRedirects from "../core/redirect";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

type ARGV = {
    _: (string | number)[]; 
    $0: string;
    "spreadsheet-id": string;
    "sheet-id": string;
    "output-file": string;
}

const argv = yargs(hideBin(process.argv)).argv as ARGV;
const SPREADSHEET_ID: string = argv["spreadsheet-id"];
const SHEET_ID: string = argv["sheet-id"];
const OUTPUT_FILE: string = argv["output-file"];
const GOOGLE_SHEET_URL: string = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_ID}`;

convertGoogleSheetToRedirects({ googleSheetUrl: GOOGLE_SHEET_URL, outputFile: OUTPUT_FILE });