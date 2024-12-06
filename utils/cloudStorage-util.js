const admin = require("../utils/checkAdmin-util");

//刪除 Firebase Storage Images
const deleteImages = async (imageUrls) => {
  try {
    const bucket = admin.storage().bucket();

    // 檢查是否有圖片 URLs , -1 表示沒有圖片
    if (!imageUrls || imageUrls.length === 0) {
      return "-1";
    }

    // 使用 Promise.all 處理多個非同步請求
    await Promise.all(
      imageUrls.map(async (imageUrl) => {
        // 透過正則表達式提取 "o=" 參數的內容，並進行 URL 解碼
        const filePath = decodeURIComponent(imageUrl.match(/\/o\/([^?]+)/)[1]);
        const file = bucket.file(filePath);

        const [exists] = await file.exists();

        if (exists) {
          await file.delete(); // 刪除檔案
        }
      })
    );
  } catch (e) {
    console.error("刪除圖片作業有問題:", e);
  }
};

module.exports = { deleteImages };
