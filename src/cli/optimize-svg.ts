#!/usr/bin/env node
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { processSVGs } from "../core/optimize-svg";

interface CliArgs {
  input: string;
  output: string;
  prefix: string;
}

const argv = yargs(hideBin(process.argv))
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
  .option("prefix", {
    alias: "p",
    type: "string",
    demandOption: true,
    describe: "Prefix file",
  })
  .strict()
  .parseSync() as CliArgs;

const INPUT_DIR = path.resolve(argv.input);
const OUTPUT_DIR = path.resolve(argv.output);
const PREFIX = argv.prefix;

processSVGs(INPUT_DIR, OUTPUT_DIR, PREFIX);

console.log("✅ Rename images done");
console.log("📂 Input :", INPUT_DIR);
console.log("📁 Output:", OUTPUT_DIR);
console.log("📁 Prefix:", PREFIX);
