"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = convertGoogleSheetToRedirects;
const axios_1 = __importDefault(require("axios"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const fs_1 = __importDefault(require("fs"));
/**
 * Sử dụng RegEx để loại bỏ bất kỳ giao thức và tên miền nào.
 * @param {string} url - URL đầy đủ
 * @returns {string} Đường dẫn đã được làm sạch (chỉ còn path, bắt đầu bằng /)
 */
function cleanUrl(url) {
    if (typeof url !== "string" || !url)
        return "";
    const urlValid = url.trim();
    // RegEx loại bỏ: http://... hoặc https://... cho đến dấu / đầu tiên của path
    const regex = /https?:\/\/[^\/]+/;
    let path = urlValid.replace(regex, "");
    // Đảm bảo đường dẫn (path) phải bắt đầu bằng một dấu gạch chéo '/'
    if (path === "")
        return "/";
    if (!path.startsWith("/")) {
        path = "/" + path;
    }
    return path;
}
async function convertGoogleSheetToRedirects({ googleSheetUrl, outputFile }) {
    console.log(`Đang tải dữ liệu từ Google Sheet: ${googleSheetUrl}...`);
    try {
        const response = await (0, axios_1.default)({
            method: "get",
            url: googleSheetUrl,
            responseType: "stream",
        });
        const redirectArray = [];
        const stream = response.data.pipe((0, csv_parser_1.default)());
        await new Promise((resolve, reject) => {
            stream.on("data", (row) => {
                // Vui lòng thay thế "Column A Header" và "Column B Header" bằng tên header thực tế
                // hoặc dùng Object.values(row)[0] nếu sheet không có header.
                const sourceUrl = row["Column A Header"] || Object.values(row)[0];
                const destinationUrl = row["Column B Header"] || Object.values(row)[1];
                if (sourceUrl && destinationUrl) {
                    redirectArray.push({
                        source: cleanUrl(sourceUrl),
                        destination: cleanUrl(destinationUrl),
                        permanent: true,
                    });
                }
            });
            stream.on("end", () => resolve());
            stream.on("error", (err) => reject(err));
        });
        fs_1.default.writeFileSync(outputFile, JSON.stringify(redirectArray, null, 2));
        console.log("----------------------------------------------------");
        console.log(`✅ Chuyển đổi thành công!`);
        console.log(`Số lượng redirects đã tạo: ${redirectArray.length}`);
        console.log(`File đã được lưu tại: ${outputFile}`);
        console.log("----------------------------------------------------");
    }
    catch (error) {
        console.error("\n❌ Lỗi khi đọc hoặc chuyển đổi file:", error.message);
        if (error.response && error.response.status === 400) {
            console.error("Kiểm tra lại: ID Sheet, hoặc quyền truy cập (phải là public).");
        }
    }
}
// convertGoogleSheetToRedirects();
