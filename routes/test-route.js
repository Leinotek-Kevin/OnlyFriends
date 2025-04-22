const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const router = require("express").Router();
const admin = require("../utils/checkAdmin-util");
const cloudAnnou = require("../utils/cloudAnnou-util");
const User = require("../models/user-model");
const visionUtil = require("../utils/google-vision-util");

router.use((req, res, next) => {
  console.log("正在接收一個跟 test 有關的請求");
  next();
});

//設定 multer 定義上傳檔案的暫存目錄
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, //限制 5MB
  },
});

router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const bucket = admin.storage().bucket();

    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    const targetSizeKB = 500; // 目標大小 500KB
    const imageBuffer = req.file.buffer;

    // 使用 sharp 檢查圖片的大小
    const imageInfo = await sharp(imageBuffer).metadata();
    const imageSizeKB = imageInfo.size / 1024; // 計算圖片大小 (KB)

    let finalBuffer = imageBuffer;

    // 如果圖片大小小於 500KB，直接上傳
    if (imageSizeKB > targetSizeKB) {
      // 否則進行壓縮
      finalBuffer = await compressImageToSize(imageBuffer, targetSizeKB);
      console.log("檔案過大！需要壓縮！");
    }

    // 獲取上傳檔案的檔名與格式
    const fileName = `images/${Date.now()}_${req.file.originalname}`;
    const file = bucket.file(fileName);

    // 設定檔案上傳選項
    const blobStream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: uuidv4(), // 在 metadata 中設置 token
        },
      },
    });

    blobStream.on("error", (err) => {
      return res.status(500).send("Something went wrong.");
    });

    blobStream.on("finish", async () => {
      try {
        const [metadata] = await file.getMetadata();
        const fileToken = metadata.metadata.firebaseStorageDownloadTokens;

        // 重組帶有 token 的下載 URL
        const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${
          bucket.name
        }/o/${encodeURIComponent(fileName)}?alt=media&token=${fileToken}`;

        return res.status(200).send({
          message: "成功上傳檔案",
          url: downloadUrl,
        });
      } catch (error) {
        return res.status(500).send(error);
      }
    });

    // 將上傳的檔案資料寫入 Firebase Storage
    blobStream.end(finalBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Upload failed.");
  }
});

// 使用 multer 處理多檔案上傳，最多允許 10 個檔案
router.post("/upload-multi", upload.array("images", 10), async (req, res) => {
  try {
    const bucket = admin.storage().bucket();

    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No files uploaded.");
    }

    const fileUrls = [];

    // 逐個處理每個檔案
    for (const file of req.files) {
      const targetSizeKB = 500; // 目標大小 500KB
      const imageBuffer = file.buffer;

      // 使用 sharp 檢查圖片的大小
      const imageInfo = await sharp(imageBuffer).metadata();
      const imageSizeKB = imageInfo.size / 1024; // 計算圖片大小 (KB)

      let finalBuffer = imageBuffer;

      // 如果圖片大小小於 500KB，直接上傳
      if (imageSizeKB > targetSizeKB) {
        // 否則進行壓縮
        finalBuffer = await compressImageToSize(imageBuffer, targetSizeKB);
        console.log("檔案過大！需要壓縮！");
      }

      const fileName = `images/${Date.now()}_${file.originalname}`;
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
    return res.status(200).send({
      message: "成功上傳檔案",
      urls: fileUrls,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Upload failed.");
  }
});

router.post("/check-image", async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const bucket = admin.storage().bucket();

    // 透過正則表達式提取 "o=" 參數的內容，並進行 URL 解碼
    const filePath = decodeURIComponent(imageUrl.match(/\/o\/([^?]+)/)[1]);

    const file = bucket.file(filePath);

    const [exists] = await file.exists();

    if (exists) {
      await file.delete(); // 刪除檔案
      return res.status(200).send({
        message: "成功刪除雲端圖片",
      });
    } else {
      return res.status(200).send({
        message: "雲端圖片不存在",
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      message: "Server Error",
    });
  }
});

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

router.post("/add-store-msg", async (req, res) => {
  try {
    const { customType, msg, link, image } = req.body;

    const result = await cloudAnnou.addAnnouMessage({
      customType,
      msg,
      link,
      image,
    });

    return res.status(200).send({
      status: true,
      message: result == 1 ? "資料新增成功" : "資料新增失敗",
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

router.post("/remove-store-msg", async (req, res) => {
  try {
    const { customType } = req.body;

    const result = await cloudAnnou.removeAnnouMsgByType(customType);

    return res.status(200).send({
      status: true,
      message: result == 1 ? "資料刪除成功" : "資料刪除失敗",
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

router.post("/read-store-msg", async (req, res) => {
  try {
    const result = await cloudAnnou.getAnnouncement();

    return res.status(200).send({
      status: true,
      message: result ? "資料讀取成功" : "資料讀取失敗",
      data: result,
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

//檢查目前用戶大頭貼不是人, 並置換成 警示圖片
router.post("/check-user-real", async (req, res) => {
  try {
    const pLimit = (await import("p-limit")).default;
    const limit = pLimit(5); // 限制同時處理 5 個

    const aliveUser = await User.find({ identity: 2 });

    const checkPromises = aliveUser.map((user) =>
      limit(async () => {
        const userPhoto = user.userPhotos;
        if (userPhoto && userPhoto.length > 0) {
          try {
            const result = await visionUtil.checkImageForHumanFace(
              userPhoto[0]
            );

            return {
              userId: user.userID,
              hasFace: result.isFace,
            };
          } catch (error) {
            return {
              userId: user.userID,
              hasFace: false,
            };
          }
        }
      })
    );

    const results = await Promise.all(checkPromises);

    const notRealUserIds = results
      .filter((result) => result?.hasFace === false)
      .map((result) => result.userId);

    // const warningImageUrl =
    //   "https://firebasestorage.googleapis.com/v0/b/onlyfriends-20295.appspot.com/o/system%2Frobot-photo%2Fother%2Fuser-photo-warning.png?alt=media&token=adccf915-3f13-410d-ba7e-27760240a5b7";

    // //user-photo-warning 警告要換大頭貼
    // await User.updateMany(
    //   { userID: { $in: notRealUserIds } },
    //   { $set: { "userPhotos.0": warningImageUrl } }
    // );

    return res.status(200).send({
      status: true,
      message: "辨識已完成,並完成置換警示大頭貼",
      notRealUserIds,
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
    });
  }
});

module.exports = router;
