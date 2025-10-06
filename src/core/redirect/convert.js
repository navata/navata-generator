const axios = require("axios");
const csv = require("csv-parser");
const fs = require("fs");

// [CẤU HÌNH CỦA BẠN]
const SPREADSHEET_ID = "17yPqr-q3d28FhfTk2M-rFYS1Uc6Ta35PndtdB2-rIqc";
const SHEET_ID = "132624243"; // Ví dụ: 0 cho sheet đầu tiên
const DOMAIN_TO_REMOVE = "https://www.pharmacity.vn";
const OUTPUT_FILE = "redirects.json";
// [KẾT THÚC CẤU HÌNH]

const GOOGLE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_ID}`;

/**
 * Sử dụng RegEx để loại bỏ bất kỳ giao thức và tên miền nào.
 * @param {string} url - URL đầy đủ
 * @returns {string} Đường dẫn đã được làm sạch (chỉ còn path, bắt đầu bằng /)
 */
function cleanUrl(url) {
    if (typeof url !== 'string' || !url) return '';

    const urlValid = url.trim();

    // RegEx loại bỏ: http://... hoặc https://... cho đến dấu / đầu tiên của path
    const regex = /https?:\/\/[^\/]+/;
    let path = urlValid.replace(regex, '');

    // Đảm bảo đường dẫn (path) phải bắt đầu bằng một dấu gạch chéo '/'
    if (path === '') return '/';
    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    return path;
}



async function convertGoogleSheetToRedirects() {
    console.log(`Đang tải dữ liệu từ Google Sheet: ${SPREADSHEET_ID}...`);

    try {
        const response = await axios({
            method: "get",
            url: GOOGLE_SHEET_URL,
            responseType: "stream",
        });

        const redirectArray = [];
        const stream = response.data.pipe(csv());

        await new Promise((resolve, reject) => {
            stream.on("data", (row) => {
                // LƯU Ý QUAN TRỌNG:
                // Bạn cần thay thế 'Column A Header' và 'Column B Header'
                // bằng tên header thực tế của cột A và cột B trong sheet của bạn.
                // Nếu sheet không có header, có thể phải dùng index (0, 1) tùy thư viện.
                // Giả sử tên header là 'SourceUrl' và 'DestinationUrl'

                const sourceUrl =
                    row["Column A Header"] || Object.values(row)[0];
                const destinationUrl =
                    row["Column B Header"] || Object.values(row)[1];
                console.log("sourceUrl", sourceUrl);
                // Chỉ xử lý nếu cả hai URL đều tồn tại
                if (sourceUrl && destinationUrl) {
                    redirectArray.push({
                        source: cleanUrl(sourceUrl),
                        destination: cleanUrl(destinationUrl),
                        permanent: true, // Cố định theo yêu cầu
                    });
                }
            });
            stream.on("end", () => resolve());
            stream.on("error", (err) => reject(err));
        });

        // Ghi dữ liệu vào file JSON
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(redirectArray, null, 2));

        console.log("----------------------------------------------------");
        console.log(`✅ Chuyển đổi thành công!`);
        console.log(`Số lượng redirects đã tạo: ${redirectArray.length}`);
        console.log(`File đã được lưu tại: ${OUTPUT_FILE}`);
        console.log("----------------------------------------------------");
    } catch (error) {
        console.error("\n❌ Lỗi khi đọc hoặc chuyển đổi file:", error.message);
        if (error.response && error.response.status === 400) {
            console.error(
                "Kiểm tra lại: ID Sheet, hoặc quyền truy cập (phải là public)."
            );
        }
    }
}

convertGoogleSheetToRedirects();
