const admin = require("../utils/checkAdmin-util");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");

const bucketName = "onlyfriends-20295";

//刪除 Firebase Storage Images
const deleteImages = async (imageUrls) => {
  try {
    //const bucket = admin.storage().bucket();
    const bucket = admin.storage().bucket(bucketName);

    // 檢查是否有圖片 URLs , -1 表示沒有圖片
    if (!imageUrls || imageUrls.length === 0) {
      console.log("沒有圖片");
      return "-1";
    }

    // 使用 Promise.all 處理多個非同步請求
    await Promise.all(
      imageUrls.map(async (imageUrl) => {
        // 跳過包含 user-photo-warning.png 的圖片
        if (imageUrl.includes("user-photo-warning.png")) {
          return; // 如果包含預警圖片，直接跳過，不刪除
        }

        // 使用更可靠的方式提取檔案路徑
        const match = imageUrl.match(/\/o\/(.*?)\?/);

        if (match) {
          const filePath = decodeURIComponent(match[1]); // 將提取到的路徑進行 URL 解碼
          const file = bucket.file(filePath);

          const [exists] = await file.exists();

          if (exists) {
            await file.delete(); // 刪除檔案
          }
          console.log("成功刪除檔案");
        } else {
          console.log(`無法從 URL 提取檔案路徑: ${imageUrl}`);
        }
      })
    );
  } catch (e) {
    console.log("刪除圖片作業有問題:", e);
  }
};

//上傳 Firebase Storage Images
const uploadImages = async (folderName, limitSize, srcFiles) => {
  try {
    //const bucket = admin.storage().bucket();
    const bucket = admin.storage().bucket(bucketName);

    // 檢查是否有檔案 , [] 表示沒有檔案
    if (!srcFiles || srcFiles.length === 0) {
      return [];
    }

    const fileUrls = [];

    // 逐個處理每個檔案
    for (const file of srcFiles) {
      const targetSizeKB = limitSize; // 目標大小 500KB
      const imageBuffer = file.buffer;

      // 使用 sharp 檢查圖片的大小
      const imageInfo = await sharp(imageBuffer).metadata();
      const imageSizeKB = imageInfo.size / 1024; // 計算圖片大小 (KB)

      let finalBuffer = imageBuffer;

      // 如果圖片大小小於 500KB，直接上傳
      if (imageSizeKB > targetSizeKB) {
        // 否則進行壓縮
        finalBuffer = await compressImageToSize(imageBuffer, targetSizeKB);
      }

      const fileName = `${folderName}/${file.originalname}_${Date.now()}`;
      const storageFile = bucket.file(fileName);

      // 上傳檔案到 Firebase Storage
      const blobStream = storageFile.createWriteStream({
        metadata: {
          contentType: file.mimetype,
          metadata: {
            firebaseStorageDownloadTokens: uuidv4(), // 在 metadata 中設置唯一 token
          },
        },
      });

      await new Promise((resolve, reject) => {
        blobStream.on("error", (err) => reject(err));

        blobStream.on("finish", async () => {
          try {
            // 獲取該檔案的 metadata
            const [metadata] = await storageFile.getMetadata();
            const fileToken = metadata.metadata.firebaseStorageDownloadTokens;

            // 組成該檔案的下載 URL
            const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${
              bucket.name
            }/o/${encodeURIComponent(fileName)}?alt=media&token=${fileToken}`;

            // 將該檔案的下載 URL 推入陣列中
            fileUrls.push(downloadUrl);

            resolve();
          } catch (error) {
            reject(error);
          }
        });

        // 將檔案資料寫入 Firebase Storage
        blobStream.end(finalBuffer);
      });
    }

    // 上傳完成後返回所有檔案的 URL
    return fileUrls;
  } catch (error) {
    console.error(error);
    return [];
  }
};

//讀取 Firebase Storage Images 檔案路徑格式 : cat-01-1
const getImagesByFolder = async (folderName) => {
  try {
    //const bucket = admin.storage().bucket();
    // 指定 bucket 名稱
    const bucket = admin.storage().bucket(bucketName);

    // 指定要讀取的資料夾 (P0-Cat)
    const [files] = await bucket.getFiles({
      prefix: folderName,
    });

    // 建立檔案 URL 陣列
    const fileUrls = [];

    for (const file of files) {
      // 獲取該檔案的 metadata
      const [metadata] = await file.getMetadata();
      const fileToken = metadata.metadata.firebaseStorageDownloadTokens;

      // 生成該檔案的下載 URL
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${
        bucket.name
      }/o/${encodeURIComponent(file.name)}?alt=media&token=${fileToken}`;

      fileUrls.push(downloadUrl);
    }

    // 排序函式
    const itemPreStr = folderName.split("/")[1]; // 動態取得 's-cat-02'

    const regex = new RegExp(`${itemPreStr}-(\\d+)`);

    // 使用動態正則表達式進行排序
    const sortedUrls = fileUrls
      .filter((url) => url.includes(itemPreStr) && url.match(regex))
      .sort((a, b) => {
        // 動態正則匹配 's-cat-02-' 後的數字
        const numA = parseInt(a.match(regex)[1], 10);
        const numB = parseInt(b.match(regex)[1], 10);

        return numA - numB;
      });

    return sortedUrls; // 返回所有檔案的 URL 陣列
  } catch (e) {
    console.log(e);
    return [];
  }
};

// 壓縮圖片到指定大小
const compressImageToSize = (imageBuffer, targetSizeKB) => {
  return new Promise((resolve, reject) => {
    let quality = 100; // 初始質量設為 100

    const tryCompress = () => {
      sharp(imageBuffer)
        .jpeg({ quality }) // 壓縮圖片並設置質量
        .toBuffer() // 轉換為 Buffer
        .then((compressedBuffer) => {
          const sizeInKB = compressedBuffer.length / 1024; // 計算檔案大小 (KB)

          if (sizeInKB <= targetSizeKB) {
            resolve(compressedBuffer); // 如果檔案大小滿足要求，返回結果
          } else if (quality > 10) {
            quality -= 10; // 如果檔案還是太大，繼續減少質量
            tryCompress(); // 遞歸再次壓縮
          } else {
            reject("Unable to compress image within target size");
          }
        })
        .catch((err) => {
          reject(err);
        });
    };

    tryCompress(); // 開始壓縮過程
  });
};

// 刪除資料夾檔案的方法
const deleteFolderFiles = async (folderPath) => {
  try {
    //const bucket = admin.storage().bucket();
    const bucket = admin.storage().bucket(bucketName);

    // 使用 deleteFiles 方法一次性刪除資料夾中的所有檔案
    await bucket.deleteFiles({
      prefix: folderPath, // 設置資料夾的路徑，這會保留資料夾本身
    });

    console.log(`成功刪除 ${folderPath} 資料夾中的所有檔案`);
  } catch (e) {
    console.log("刪除資料夾檔案時出現問題:", e);
  }
};

module.exports = {
  deleteImages,
  uploadImages,
  getImagesByFolder,
  deleteFolderFiles,
};
