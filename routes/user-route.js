const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");

const User = require("../models").user;
const UserRelation = require("../models").userRelation;
const MatchNeswest = require("../models").matchNewest;
const Config = require("../models").config;
const Report = require("../models").report;
const Sticker = require("../models").sticker;

const dateUtil = require("../utils/date-util");
const passport = require("passport");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const { ReportReasons } = require("../config/enum");
const { boolean } = require("joi");

//先驗證 user 是不是存在，並獲取 user info
router.use((req, res, next) => {
  console.log("正在接收一個跟 user 有關的請求");
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ status: false, message: "伺服器錯誤" });
    }

    if (!user) {
      // 這裡返回自定義訊息
      return res.status(200).send({
        status: true,
        message: "JWT 驗證失敗！查無此用戶!",
        validCode: "0",
      });
    } else if (user.userValidCode == "2") {
      return res.status(200).send({
        status: true,
        message: "該用戶已被停權！",
        validCode: "2",
      });
    }

    // 驗證成功，將 user 資料放入 req.user
    req.user = user;
    next();
  })(req, res); // 注意這裡要馬上調用 authenticate 函數
});

//B-1 獲取使用者資訊
router.post("/info", async (req, res) => {
  try {
    let {
      action,
      userName,
      userPhotos,
      userRegion,
      userMBTI,
      userQuestion,
      notificationStatus,
      emotion,
      interested,
      traits,
      friendStatus,
      loveExperience,
    } = req.body;

    let { userEmail, userID, registerTime, lastSendLetterTime } = req.user;

    let isTodayRegister = dateUtil.isToday(registerTime);
    let isTodayEverSend = dateUtil.isToday(lastSendLetterTime);

    //拷貝 req.user，確保 output 是一個獨立 object
    let data = {
      ...req.user._doc,
      isTodayRegister,
      isTodayEverSend,
    };

    //刪掉不要的字段
    delete data._id;
    delete data.__v;
    delete data.lastSendLetterTime;
    delete data.registerTime;
    delete data.lastLoginTime;
    delete data.userValidCode;

    //讀取或更改用戶資料
    if (action == 0) {
      return res.status(200).send({
        status: true,
        message: "成功讀取用戶資訊",
        validCode: "1",
        data,
      });
    }

    if (action == 1) {
      // 準備要更新的資料
      let updateData = {};

      //用戶可以改暱稱,頭貼,地區,感情狀態,興趣愛好,個人特質,交友動態,情場經歷, 提問
      // 如果有提供 userName，才將其加入更新資料中
      if (userName != null) {
        updateData.userName = userName;
      }

      if (userPhotos != null) {
        try {
          const photoArray = JSON.parse(userPhotos);
          updateData.userPhotos = photoArray;
        } catch (e) {
          console.log("JSON 解析失敗:", e);
        }
      }

      if (userRegion != null) {
        updateData.userRegion = userRegion;
      }

      if (userMBTI != null) {
        updateData.userRegion = userMBTI;
      }

      if (userQuestion != null) {
        updateData.userQuestion = userQuestion;
      }

      if (notificationStatus != null) {
        updateData.notificationStatus = notificationStatus;
      }

      if (emotion != null) {
        updateData.userAttribute.emotion = emotion;
      }

      if (interested != null) {
        updateData.userAttribute.interested = interested;
      }

      if (traits != null) {
        updateData.userAttribute.traits = traits;
      }

      if (friendStatus != null) {
        updateData.userAttribute.friendStatus = friendStatus;
      }

      if (loveExperience != null) {
        updateData.userAttribute.loveExperience = loveExperience;
      }

      const data = await User.findOneAndUpdate(
        { userEmail, userID },
        { $set: updateData },
        {
          new: true,
          upsert: true,
        }
      );

      return res.status(200).send({
        status: true,
        message: "更新用戶資訊成功",
        validCode: "1",
        data,
      });
    }
  } catch (e) {
    return res.status(500).send({
      status: true,
      message: "Server Error!",
      validCode: "-1",
    });
  }
});

//B-2 獲取本日配對的對象資訊
router.post("/today-matches", async (req, res) => {
  try {
    let { userID, isSubscription } = req.user;
    let {
      matchRecord: {
        general: { status: matchScheduleStatus },
      },
      annuChannel,
    } = await Config.findOne({});

    //查詢目前使用者標記好感度的對象
    let relation = await UserRelation.findOne({ userID });

    let signObjects = [];

    if (relation) {
      let { likeObjects, updateDate } = relation.objectActive;

      let today = dateUtil.getToday();
      let isNotToday = updateDate !== today;

      if (isNotToday) {
        await UserRelation.updateOne(
          {
            userID,
          },
          {
            "objectActive.likeObjects": [],
            "objectActive.updateDate": today,
          }
        );
      } else {
        signObjects = likeObjects;
      }
    }

    //是否接近午夜
    const isCloseNight =
      dateUtil.getTomorrowNight() - Date.now() <= 30 * 60 * 1000;

    //獲取今天所有配對
    const newestMatches = await MatchNeswest.find({
      $or: [{ user1ID: userID }, { user2ID: userID }],
    })
      .populate("user1_ID", [
        "userName",
        "userID",
        "userPhotos",
        "userQuestion",
        "notificationStatus",
      ])
      .populate("user2_ID", [
        "userName",
        "userID",
        "userPhotos",
        "userQuestion",
        "notificationStatus",
      ])
      .sort({
        uiType: 1,
      });

    const matches = [];

    if (newestMatches.length > 0) {
      //OF 團隊聊天室
      let serviceData = {
        uiType: 0,
        sendbirdUrl: "onlyfriends_announcement_channel",
      };

      matches.push(serviceData);

      //整理要輸出給前端的配對資料
      newestMatches.forEach(async (match) => {
        let objectInfo =
          match.user1ID === userID ? match.user2_ID : match.user1_ID;

        let outData = {
          uiType: match.matchUIType,
          userID: objectInfo.userID,
          userName: objectInfo.userName,
          userQuestion: objectInfo.userQuestion,
          userPhotos: objectInfo.userPhotos,
          notificationStatus: objectInfo.notificationStatus,
          sendbirdUrl: match.sendbirdUrl,
          isChecked: match.isChecked,
          likeLevel: 1,
          letterYourContent: "",
          letterObjectContent: "",
        };

        if (match.matchUIType == 1) {
          //一般配對
          //提取與對象的好感度LikeLevel
          let foundObject = signObjects.find(
            (obj) => obj.objectID === objectInfo.userID
          );

          if (foundObject) {
            //輸出目前標記的好感度
            outData.likeLevel = foundObject.likeLevel;
          }

          if (isSubscription) {
            //如果有訂閱,直接最高等級
            outData.likeLevel = 3;
          }
        } else if (match.matchUIType == 2) {
          //樹洞配對
          //提取你的信封內容
          outData.letterYourContent =
            match.user1ID === userID
              ? match.user1letterContent
              : match.user2letterContent;

          //提取對方的信封內容
          outData.letterObjectContent =
            match.user1ID === userID
              ? match.user2letterContent
              : match.user1letterContent;
        }

        matches.push(outData);
      });

      return res.status(200).send({
        status: true,
        message: "成功獲取配對對象列表",
        validCode: "1",
        data: {
          isCloseNight,
          matchScheduleStatus,
          matches,
        },
      });
    } else {
      return res.status(200).send({
        status: true,
        message: "目前沒有對象",
        validCode: "1",
        data: {
          isCloseNight,
          matchScheduleStatus,
          matches,
        },
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: false,
      message: "Server Error",
      validCode: "-1",
      e,
    });
  }
});

//B-3 檢查用戶聊天渠道
router.post("/check-channel", async (req, res) => {
  try {
    let { channelUrl } = req.body;

    const match = await MatchNeswest.findOne({
      sendbirdUrl: channelUrl,
    });

    let { chatCover } = await Config.findOne({});

    if (match != null && match.isChecked) {
      return res.status(200).send({
        status: true,
        message: "這個渠道已經檢查過嚕！",
        validCode: "1",
      });
    } else {
      //房間配對對象
      let [user1ID, user2ID] = channelUrl.split("_");

      // SendBird API URL
      const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/group_channels`;

      // API Token
      const apiToken = process.env.SENDBIRD_API_TOKEN;

      // Request Headers
      const headers = {
        "Content-Type": "application/json, charset=utf8",
        "Api-Token": apiToken,
      };

      // Request Body (JSON data)
      const data = {
        name: user1ID + "&" + user2ID + "的房間",
        channel_url: channelUrl,
        cover_url: chatCover,
        custom_type: "chat",
        is_distinct: true,
        user_ids: [user1ID, user2ID],
        operator_ids: [process.env.SENDBIRD_OPERATOR_ID],
      };

      axios
        .post(url, data, { headers })
        .then(async (response) => {
          if (response.status === 200) {
            await MatchNeswest.findOneAndUpdate(
              {
                sendbirdUrl: channelUrl,
              },
              {
                isChecked: true,
              }
            );

            return res.status(200).send({
              status: true,
              message: "渠道檢查完成",
              validCode: "1",
              data: {
                isChecked: true,
              },
            });
          } else {
            return res.status(200).send({
              status: true,
              message: "渠道檢查有問題",
              validCode: "1",
              data: {
                isChecked: false,
              },
            });
          }
        })
        .catch((e) => {
          console.log(e);
          return res.status(200).send({
            status: true,
            message: "渠道檢查有問題",
            validCode: "1",
            data: {
              isChecked: false,
            },
          });
        });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: true,
      message: "Server Error",
      validCode: "-1",
      e,
    });
  }
});

//B-4 更新配對的篩選條件
router.post("/update-condition", async (req, res) => {
  try {
    let { userID, userEmail, isSubscription } = req.user;
    let { gender, minAge, maxAge, region } = req.body;

    let updateData = {
      objectCondition: {
        objectGender: gender,
        objectAge: {
          maxAge,
          minAge,
        },
      },
    };

    if (isSubscription && region != null) {
      updateData.objectCondition.objectRegion = region;
    }

    await User.updateOne(
      { userID, userEmail },
      {
        $set: updateData,
      }
    );

    return res.status(200).send({
      status: true,
      message: "成功修改配對條件",
      validCode: "1",
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      validCode: "-1",
    });
  }
});

//B-5 標記好感度的對象用戶
router.post("/sign-object", async (req, res) => {
  try {
    let { userID } = req.user;
    let { objectID, likeLevel } = req.body;

    let relation = await UserRelation.findOne({ userID });

    if (relation) {
      let likeObjects = relation.objectActive.likeObjects;

      let foundObject = likeObjects.find((obj) => obj.objectID === objectID);

      if (foundObject) {
        //修改likeLevel
        foundObject.likeLevel = likeLevel;
      } else {
        //找不到對象,直接新增
        likeObjects.push({
          objectID,
          likeLevel,
        });
      }

      await relation.save();
    } else {
      //如果找不到任何該用戶的關係表,就直接新增
      let likeObjects = [
        {
          objectID,
          likeLevel,
        },
      ];

      await UserRelation.create({
        userID,
        objectActive: {
          likeObjects,
          updateDate: dateUtil.getToday(),
        },
      });
    }

    return res.status(200).send({
      status: true,
      message: "成功標記對象好感度",
      validCode: "1",
      data: {
        likeLevel: Number(likeLevel),
      },
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      validCode: "-1",
      e,
    });
  }
});

//B-6 封鎖/解除封鎖指定對象用戶
router.post("/lock-object", async (req, res) => {
  try {
    let { userID } = req.user;
    let { action, objectID } = req.body;

    let relation = await UserRelation.findOne({ userID });

    let currentUnlikes = [];

    if (relation) {
      currentUnlikes = relation.unlikeUsers;
    }

    if (action == "0") {
      // 解除封鎖
      if (
        currentUnlikes.length == 0 ||
        currentUnlikes.indexOf(objectID) == -1
      ) {
        return res.status(200).send({
          status: true,
          message: "您沒有封鎖這個用戶啊！",
          validCode: "1",
        });
      } else {
        currentUnlikes = currentUnlikes.filter((id) => id !== objectID);

        await UserRelation.findOneAndUpdate(
          { userID },
          {
            unlikeUsers: currentUnlikes,
          },
          {
            upsert: true,
          }
        );

        return res.status(200).send({
          status: true,
          message: "您已成功解鎖對方！",
          validCode: "1",
        });
      }
    }

    if (action == "1") {
      // 封鎖
      if (currentUnlikes.indexOf(objectID) == -1) {
        currentUnlikes.push(objectID);

        await UserRelation.findOneAndUpdate(
          { userID },
          {
            unlikeUsers: currentUnlikes,
          },
          {
            upsert: true,
          }
        );

        return res.status(200).send({
          status: true,
          message: "您已成功封鎖對方！",
          validCode: "1",
        });
      } else {
        //已經存在封鎖關係列表
        return res.status(200).send({
          status: true,
          message: "這個用戶您已經封鎖過勒！",
          validCode: "1",
        });
      }
    }
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      validCode: "-1",
      e,
    });
  }
});

//B-7 取得與用戶聊天的關係
router.post("/get-relationship", async (req, res) => {
  try {
    let { userID } = req.user;
    let { objectID } = req.body;

    const userRelation = await UserRelation.findOne({ userID });
    const userUnlikes = userRelation == null ? [] : userRelation.unlikeUsers;

    const objectRelation = await UserRelation.findOne({ userID: objectID });
    const objectUnlikes =
      objectRelation == null ? [] : objectRelation.unlikeUsers;

    const data = {};

    data.isYouLockObject = userUnlikes.indexOf(objectID) != -1;
    data.canYouNotifyObject =
      !data.isYouLockObject && objectUnlikes.indexOf(userID) == -1;

    return res.status(200).send({
      status: true,
      message: "獲取與對象的關係",
      validCode: "1",
      data,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: false,
      message: "Server Error",
      validCode: "-1",
      e,
    });
  }
});

//B-8 獲取可檢舉項目資訊
router.post("/report", async (req, res) => {
  try {
    let { action } = req.body;

    if (action == "0") {
      return res.status(200).send({
        status: true,
        message: "獲取可檢舉項目",
        data: {
          info: null,
          items: ReportReasons,
        },
      });
    } else if (action == "1") {
      let { objectID, reasonItemID, content, photos } = req.body;
      let { userID } = req.user;

      const uuid = uuidv4(); // 生成 UUID v4

      // 查找對應的報告原因
      const reasonItemDes = ReportReasons.find(
        (r) => r.reasonItemID == reasonItemID
      ).description;

      let reportData = {
        reportID: uuid.replace(/\D/g, "").slice(0, 10),
        reportUserID: userID,
        reportObjectID: objectID,
        reasonItemID,
        reasonItemDes,
        content,
        photos: [],
      };

      //檢舉照片
      if (photos != null) {
        try {
          const photoArray = JSON.parse(photos);
          reportData.photos = photoArray;
        } catch (e) {
          console.log("JSON 解析失敗:", e);
        }
      }

      await Report.create(reportData);

      return res.status(200).send({
        status: true,
        message: "檢舉成功！",
        validCode: "1",
        data: {
          info: reportData,
          items: ReportReasons,
        },
      });
    } else {
      return res.status(500).send({
        status: false,
        message: "參數錯誤！",
        validCode: "1",
      });
    }
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      validCode: "-1",
      e,
    });
  }
});

//B-9 取得 OF 貼圖系列集
router.post("/get-stickers", async (req, res) => {
  try {
    const { isSubscription } = req.user;
    const data = await Sticker.find({ stickersAvailable: true }).sort({
      priority: -1,
    });

    const result = [];

    data.forEach((series) => {
      const handleSeries = {
        ...series._doc,
        isFreeToYou: isSubscription ? true : series.stickersPlan == "F",
      };

      delete handleSeries._id;
      delete handleSeries.__v;
      delete handleSeries.stickersAvailable;

      result.push(handleSeries);
    });

    return res.status(200).send({
      status: true,
      message: "成功獲取貼圖系列",
      validCode: "1",
      data: result,
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
      validCode: "-1",
    });
  }
});

//後端使用 SendBird 不開放前端
router.post("/delete-room", async (req, res) => {
  let { channelUrl } = req.body; //刪除的群組頻道 URL
  const apiToken = process.env.SENDBIRD_API_TOKEN;

  // API 請求 URL
  const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/group_channels/${channelUrl}`;

  // Request Headers
  const headers = {
    "Api-Token": apiToken,
  };

  try {
    const response = await axios.delete(url, { headers });
    return res.status(200).send({
      status: true,
      message: "刪除成功",
    });
  } catch (error) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      error,
    });
  }
});

module.exports = router;
