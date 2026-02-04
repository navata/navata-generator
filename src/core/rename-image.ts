#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { optimize } from "svgo";

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".avif"]);

const normalize = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function processDir(srcDir: string, destDir: string): void {
  ensureDir(destDir);

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);

    if (entry.isDirectory()) {
      const newDirName = normalize(entry.name);
      processDir(srcPath, path.join(destDir, newDirName));
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;

    const base = path.basename(entry.name, ext);
    const newFileName = `${normalize(base)}${ext}`;
    const destPath = path.join(destDir, newFileName);

    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function processSVGs(inputDir: string, outputDir: string) {
  fs.mkdirSync(outputDir, { recursive: true });
  const files = fs.readdirSync(inputDir);

  for (const file of files) {
    if (path.extname(file) !== ".svg") continue;

    const filePath = path.join(inputDir, file);
    const svgData = fs.readFileSync(filePath, "utf8");

    // Tối ưu bằng SVGO
    const result = optimize(svgData, { path: filePath });

    // Logic Rename: Xoá timestamp (Ví dụ xoá 14 chữ số đầu và dấu gạch)
    // 20260204043705-0-pmc-voucher-thumbnail.svg -> pmc-voucher-thumbnail.svg
    // const cleanName = file.replace(/^\d+-\d+-/, "");
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, ext);
    const newFileName = `${normalize(base)}${ext}`;

    fs.writeFileSync(path.join(outputDir, newFileName), result.data);
    console.log(`✅ Optimized & Renamed: ${newFileName}`);
  }
}
