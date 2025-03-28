const router = require("express").Router();
const User = require("../models").user;
const Config = require("../models").config;
const generalUtil = require("../utils/general-util");
const visionUtil = require("../utils/google-vision-util");

//查詢指定用戶
router.post("/query-user", async (req, res) => {
  try {
    let { userID } = req.body;

    const data = await User.findOne({
      userID,
    });

    if (data) {
      return res.status(200).send({
        status: true,
        message: "成功獲取使用者資訊",
        data,
      });
    } else {
      return res.status(200).send({
        status: true,
        message: "查無此用戶！",
      });
    }
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});

//讀取版本號碼
router.post("/curd-version", async (req, res) => {
  const { action, screct, versionName, versionCode, forceUpdate, osType } =
    req.body;

  try {
    if (screct == "OnlyFriends5278") {
      const config = await Config.findOne();

      //讀取版本
      if (action == "0") {
        return res.status(200).send({
          status: true,
          message: (osType == "0" ? "Android:" : "iOS") + "目前版本資訊",
          data: osType == "0" ? config.androidVersion : config.iosVersion,
        });
      }
      //更改版本
      if (action == "1") {
        //Android 更改
        if (osType == "0") {
          await Config.updateOne({
            "androidVersion.name": generalUtil.isNotNUllEmpty(versionName)
              ? versionName
              : config.androidVersion.name,
            "androidVersion.code": generalUtil.isNotNUllEmpty(versionCode)
              ? versionCode
              : config.androidVersion.code,
            "androidVersion.forceUpdate": generalUtil.isNotNUllEmpty(
              forceUpdate
            )
              ? forceUpdate
              : config.androidVersion.forceUpdate,
          });
        } else {
          //iOS 更改
          await Config.updateOne({
            "iosVersion.name": generalUtil.isNotNUllEmpty(versionName)
              ? versionName
              : config.iosVersion.name,
            "iosVersion.code": generalUtil.isNotNUllEmpty(versionCode)
              ? versionCode
              : config.iosVersion.code,
            "iosVersion.forceUpdate": generalUtil.isNotNUllEmpty(forceUpdate)
              ? forceUpdate
              : config.iosVersion.forceUpdate,
          });
        }

        return res.status(200).send({
          status: true,
          message: "更改成功",
        });
      }
    } else {
      return res.status(200).send({
        status: true,
        message: "金鑰錯誤！",
      });
    }
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});

//檢查註冊照片是否符合規範
router.post("/check-photo", async (req, res) => {
  try {
    const { photo } = req.body;

    if (!generalUtil.isNotNUllEmpty(photo)) {
      return res.status(200).send({
        status: true,
        message: "請提供要檢查的圖片網址",
        data: null,
      });
    }

    //先檢查是否合規
    const imageResult = await visionUtil.checkImageForIllegal(photo);

    if (!imageResult.isSafe) {
      //違規照片
      return res.status(200).send({
        status: true,
        message: "您的照片已違反 Only Friends 使用者規範！",
        data: {
          checkCode: 101,
          checkMessage: imageResult.reason,
        },
      });
    }

    //在檢查是否是個人
    // const faceResult = await visionUtil.checkImageForHumanFace(photo);

    // if (!faceResult.isFace) {
    //   //不是一個人臉
    //   return res.status(200).send({
    //     status: true,
    //     message: "您上傳的照片不符合真實人臉特徵",
    //     data: {
    //       checkCode: 102,
    //       checkMessage: faceResult.reason,
    //     },
    //   });
    // }

    return res.status(200).send({
      status: true,
      message: "您的照片已通過審核！",
      data: {
        checkCode: 100,
        checkMessage: "This photo has been approved!",
      },
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});
module.exports = router;
