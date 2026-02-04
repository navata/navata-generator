export default {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          removeViewBox: false, // Quan trọng: Giữ lại để co giãn được
          cleanupIds: false, // Tránh làm hỏng các liên kết gradient bên trong
        },
      },
    },
    "prefixIds", // Tự động thêm prefix để tránh trùng ID giữa các file SVG khác nhau trên cùng 1 trang
  ],
};
