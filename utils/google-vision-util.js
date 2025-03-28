const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT || 8080;
const vision = require("@google-cloud/vision");

const isLocal = port == 8080;
let keyFilePath;

if (isLocal) {
  keyFilePath = path.join(__dirname, "../onlyfriends-developer.json"); // 本地開發使用本地憑證文件
} else {
  const serviceAccount = JSON.parse(process.env.GOOGLE_DEVELOPER_ACCOUNT);
  keyFilePath = path.join(__dirname, "temp-google-service-account.json");

  // 寫入臨時檔案
  fs.writeFileSync(keyFilePath, JSON.stringify(serviceAccount));
}

// 初始化 Google Cloud Vision 客戶端
const client = new vision.ImageAnnotatorClient({
  keyFilename: keyFilePath,
});

//檢查圖片中的不當內容
async function checkImageForIllegal(imageUrl) {
  try {
    // 發送塗片 URL 給 Vision API 進行審查
    const [result] = await client.safeSearchDetection(imageUrl);
    const detections = result.safeSearchAnnotation;

    // 檢查是否包含成人內容或暴力或醫療
    if (detections.adult === "LIKELY" || detections.adult === "VERY_LIKELY") {
      return { isSafe: false, reason: "Adult content detected" };
    }
    if (
      detections.violence === "LIKELY" ||
      detections.violence === "VERY_LIKELY"
    ) {
      return { isSafe: false, reason: "Violent content detected" };
    }

    if (
      detections.medical === "LIKELY" ||
      detections.medical === "VERY_LIKELY"
    ) {
      return { isSafe: false, reason: "Medical content detected" };
    }

    // 如果沒有不當內容，返回安全標示
    return { isSafe: true, reason: "This content is Safe" };
  } catch (error) {
    return { isSafe: false, reason: "Error during content check" };
  }
}

async function checkImageForHumanFace(imageUrl) {
  let result = { isFace: false, reason: "No face detected" };

  try {
    // 發送圖片 URL 給 Vision API 進行審查
    const [faceResult] = await client.faceDetection(imageUrl);

    // 取得回應中的人臉標註
    const faces = faceResult.faceAnnotations;

    if (faces.length > 0) {
      faces.forEach((face, index) => {
        if (face.detectionConfidence >= 0.7) {
          result.isFace = true;
          result.reason = "This face is Human ";
          result.detectionConfidence = face.detectionConfidence;
        }
      });
    }

    return result;
  } catch (error) {
    result.reason = "Error during face detection";
    return result;
  }
}

module.exports = {
  checkImageForIllegal,
  checkImageForHumanFace,
};
