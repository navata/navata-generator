#!/usr/bin/env node
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { processSVGs } from "../core/rename-image";

interface CliArgs {
  input: string;
  output: string;
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
  .strict()
  .parseSync() as CliArgs;

const INPUT_DIR = path.resolve(argv.input);
const OUTPUT_DIR = path.resolve(argv.output);

processSVGs(INPUT_DIR, OUTPUT_DIR);

console.log("✅ Rename images done");
console.log("📂 Input :", INPUT_DIR);
console.log("📁 Output:", OUTPUT_DIR);
