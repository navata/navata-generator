#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processDir = processDir;
exports.processSVGs = processSVGs;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const svgo_1 = require("svgo");
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".avif"]);
const normalize = (name) => name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
function ensureDir(dir) {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
function processDir(srcDir, destDir) {
    ensureDir(destDir);
    const entries = fs_1.default.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path_1.default.join(srcDir, entry.name);
        if (entry.isDirectory()) {
            const newDirName = normalize(entry.name);
            processDir(srcPath, path_1.default.join(destDir, newDirName));
            continue;
        }
        if (!entry.isFile())
            continue;
        const ext = path_1.default.extname(entry.name).toLowerCase();
        if (!IMAGE_EXTS.has(ext))
            continue;
        const base = path_1.default.basename(entry.name, ext);
        const newFileName = `${normalize(base)}${ext}`;
        const destPath = path_1.default.join(destDir, newFileName);
        if (!fs_1.default.existsSync(destPath)) {
            fs_1.default.copyFileSync(srcPath, destPath);
        }
    }
}
function processSVGs(inputDir, outputDir) {
    fs_1.default.mkdirSync(outputDir, { recursive: true });
    const files = fs_1.default.readdirSync(inputDir);
    for (const file of files) {
        if (path_1.default.extname(file) !== ".svg")
            continue;
        const filePath = path_1.default.join(inputDir, file);
        const svgData = fs_1.default.readFileSync(filePath, "utf8");
        // Tối ưu bằng SVGO
        const result = (0, svgo_1.optimize)(svgData, { path: filePath });
        // Logic Rename: Xoá timestamp (Ví dụ xoá 14 chữ số đầu và dấu gạch)
        // 20260204043705-0-pmc-voucher-thumbnail.svg -> pmc-voucher-thumbnail.svg
        // const cleanName = file.replace(/^\d+-\d+-/, "");
        const ext = path_1.default.extname(file).toLowerCase();
        const base = path_1.default.basename(file, ext);
        const newFileName = `${normalize(base)}${ext}`;
        fs_1.default.writeFileSync(path_1.default.join(outputDir, newFileName), result.data);
        console.log(`✅ Optimized & Renamed: ${newFileName}`);
    }
}
