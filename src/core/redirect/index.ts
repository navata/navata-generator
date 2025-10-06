import axios from "axios";
import csv from "csv-parser";
import fs from "fs";

// [CẤU HÌNH CỦA BẠN]
// const SPREADSHEET_ID: string = "17yPqr-q3d28FhfTk2M-rFYS1Uc6Ta35PndtdB2-rIqc";
// const SHEET_ID: string = "132624243";
// const OUTPUT_FILE: string = "redirects.json";
// [KẾT THÚC CẤU HÌNH]

type ConvertGoogleSheetToRedirects = {
    googleSheetUrl: string;
    outputFile: string;
}

type Redirect = {
    source: string;
    destination: string;
    permanent: boolean;
}

/**
 * Sử dụng RegEx để loại bỏ bất kỳ giao thức và tên miền nào.
 * @param {string} url - URL đầy đủ
 * @returns {string} Đường dẫn đã được làm sạch (chỉ còn path, bắt đầu bằng /)
 */
function cleanUrl(url: string | unknown): string {
    if (typeof url !== "string" || !url) return "";

    const urlValid: string = url.trim();

    // RegEx loại bỏ: http://... hoặc https://... cho đến dấu / đầu tiên của path
    const regex: RegExp = /https?:\/\/[^\/]+/;
    let path: string = urlValid.replace(regex, "");

    // Đảm bảo đường dẫn (path) phải bắt đầu bằng một dấu gạch chéo '/'
    if (path === "") return "/";
    if (!path.startsWith("/")) {
        path = "/" + path;
    }
    return path;
}

export default async function convertGoogleSheetToRedirects({ googleSheetUrl, outputFile }: ConvertGoogleSheetToRedirects): Promise<void> {
    console.log(`Đang tải dữ liệu từ Google Sheet: ${googleSheetUrl}...`);

    try {
        const response = await axios({
            method: "get",
            url: googleSheetUrl,
            responseType: "stream",
        });

        const redirectArray: Redirect[] = [];
        const stream = response.data.pipe(csv());

        await new Promise<void>((resolve, reject) => {
            stream.on("data", (row: any) => {
                // Vui lòng thay thế "Column A Header" và "Column B Header" bằng tên header thực tế
                // hoặc dùng Object.values(row)[0] nếu sheet không có header.
                const sourceUrl: string | undefined =
                    row["Column A Header"] || Object.values(row)[0];
                const destinationUrl: string | undefined =
                    row["Column B Header"] || Object.values(row)[1];

                if (sourceUrl && destinationUrl) {
                    redirectArray.push({
                        source: cleanUrl(sourceUrl),
                        destination: cleanUrl(destinationUrl),
                        permanent: true,
                    });
                }
            });
            stream.on("end", () => resolve());
            stream.on("error", (err: Error) => reject(err));
        });

        fs.writeFileSync(outputFile, JSON.stringify(redirectArray, null, 2));

        console.log("----------------------------------------------------");
        console.log(`✅ Chuyển đổi thành công!`);
        console.log(`Số lượng redirects đã tạo: ${redirectArray.length}`);
        console.log(`File đã được lưu tại: ${outputFile}`);
        console.log("----------------------------------------------------");
    } catch (error: any) {
        console.error("\n❌ Lỗi khi đọc hoặc chuyển đổi file:", error.message);
        if (error.response && error.response.status === 400) {
            console.error(
                "Kiểm tra lại: ID Sheet, hoặc quyền truy cập (phải là public)."
            );
        }
    }
}

// convertGoogleSheetToRedirects();
