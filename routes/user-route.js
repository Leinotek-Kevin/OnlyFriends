const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");

const User = require("../models").user;
const UserRelation = require("../models").userRelation;
const MatchNewest = require("../models").matchNewest;
const Config = require("../models").config;
const Report = require("../models").report;
const Sticker = require("../models").sticker;
const Topic = require("../models").topic;
const PromotionCode = require("../models").promotionCode;
const PromotionStub = require("../models").promotionStub;

//推廣者
const PromoterUser = require("../models").promoterUser;
//被推廣者
const ReferalUser = require("../models").referalUser;
//聯盟行銷活動
const PromotionActivity = require("../models").promotionActivity;
//交易紀錄
const Transcation = require("../models").transcation;

const dateUtil = require("../utils/date-util");
const storageUtil = require("../utils/cloudStorage-util");
const sendbirdUtil = require("../utils/sendbird-util");
const sbUtil = require("../utils/sendbird-util");
const generalUtil = require("../utils/general-util");
const visionUtil = require("../utils/google-vision-util");
const passport = require("passport");
const dotenv = require("dotenv");
dotenv.config();

const { TopicNames } = require("../config/enum");

const {
  ReportReasons,
  Interesteds,
  Traits,
  FriendMotives,
  Values,
} = require("../config/enum");
const { referalUser } = require("../models");

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
    } = req.body;

    let { userEmail, userID, registerTime, lastSendLetterTime } = req.user;

    let isTodayRegister = dateUtil.isToday(registerTime);
    let isTodayEverSend = dateUtil.isToday(lastSendLetterTime);

    //拷貝 req.user，確保 output 是一個獨立 object
    let data = {
      ...req.user._doc,
      isTodayRegister,
      isTodayEverSend,
      officialLink: process.env.ONLY_FRIENDS_OFFICIAL_LINK,
      sharedLink: process.env.ONLY_FRIENDS_SHARED_LINK,
    };

    //刪掉不要的字段
    delete data._id;
    delete data.__v;
    delete data.lastSendLetterTime;
    delete data.registerTime;
    delete data.lastLoginTime;
    //delete data.userAttribute;
    //delete data.userValidCode;

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
      if (generalUtil.isNotNUllEmpty(userName)) {
        updateData.userName = userName;
      }

      if (generalUtil.isNotNUllEmpty(userPhotos)) {
        try {
          const photoArray = JSON.parse(userPhotos);
          updateData.userPhotos = photoArray;
        } catch (e) {
          console.log("JSON 解析失敗:", e);
        }
      }

      if (generalUtil.isNotNUllEmpty(userRegion)) {
        updateData.userRegion = userRegion;
      }

      if (generalUtil.isNotNUllEmpty(userMBTI)) {
        updateData.userMBTI = userMBTI;
      }

      if (generalUtil.isNotNUllEmpty(userQuestion)) {
        updateData.userQuestion = userQuestion;
      }

      if (notificationStatus != null) {
        updateData.notificationStatus = notificationStatus;
      }

      const data = await User.findOneAndUpdate(
        { userEmail, userID },
        { $set: updateData },
        {
          new: true,
          upsert: true,
        }
      );

      //更改 sendbird 用戶暱稱
      if (generalUtil.isNotNUllEmpty(updateData.userName)) {
        await sendbirdUtil.createAndUpdateUser(userID, updateData.userName);
      }

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
    let { language } = req.body;
    let {
      matchRecord: {
        general: { status: matchScheduleStatus },
      },
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
    const diffNight = dateUtil.getTomorrowNight() - Date.now();
    const isCloseNight = diffNight <= 30 * 60 * 1000 && diffNight > 0;

    //獲取今天所有配對
    //找出共同興趣
    const newestMatches = await MatchNewest.find({
      $or: [{ user1ID: userID }, { user2ID: userID }],
    })
      .populate("user1_ID", [
        "userName",
        "userID",
        "userPhotos",
        "userQuestion",
        "realVerifyStatus",
        "notificationStatus",
        "userAttribute.interested",
      ])
      .populate("user2_ID", [
        "userName",
        "userID",
        "userPhotos",
        "userQuestion",
        "realVerifyStatus",
        "notificationStatus",
        "userAttribute.interested",
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

      const mapItem = (item) => ({
        itemID: item.itemID,
        description: language == "en" ? item.des_EN : item.des_ZH,
      });

      //整理要輸出給前端的配對資料
      newestMatches.forEach(async (match) => {
        let objectInfo =
          match.user1ID === userID ? match.user2_ID : match.user1_ID;

        let outData = {
          uiType: match.matchUIType,
          userID: objectInfo.userID,
          userName: objectInfo.userName,
          userQuestion: objectInfo.userQuestion,
          realVerifyStatus: objectInfo.realVerifyStatus,
          userPhoto: "",
          notificationStatus: objectInfo.notificationStatus,
          sendbirdUrl: match.sendbirdUrl,
          isChecked: match.isChecked,
          likeLevel: 1,
          letterYourContent: "",
          letterObjectContent: "",
          topicID: match.topicID,
          topicBackGround: match.topicBackGround,
          topicColors: match.topicColors,
          commonInteresteds: [],
        };

        //一般配對
        if (match.matchUIType == 1) {
          //提取對象的照片集第一張作為對象頭貼
          if (objectInfo.userPhotos && objectInfo.userPhotos.length > 0) {
            outData.userPhoto = objectInfo.userPhotos[0];
          }

          //提取與對象的好感度LikeLevel
          let foundObject = signObjects.find(
            (obj) => obj.objectID === objectInfo.userID
          );

          if (foundObject) {
            //輸出對象的好感度標記
            outData.likeLevel = foundObject.likeLevel || 1;
          }

          if (isSubscription) {
            //如果有訂閱,直接最高等級
            outData.likeLevel = 3;
          }
          //樹洞配對
        } else if (match.matchUIType == 2) {
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

          //隨機郵戳
          outData.userPhoto = match.letterMark;
        }

        //尋找共同興趣
        const commonInterests = objectInfo.userAttribute.interested.filter(
          (interest) => req.user.userAttribute.interested.includes(interest)
        );

        if (commonInterests != null && commonInterests.length > 0) {
          //提取用戶的興趣
          outData.commonInteresteds = Interesteds.filter((item) =>
            commonInterests.includes(item.itemID)
          ) // 過濾出與興趣陣列相符的項目
            .map(mapItem);
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
          openChannelUrl: "onlyfriends_announcement_channel",
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
          openChannelUrl: "onlyfriends_announcement_channel",
          matches,
        },
      });
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

//B-3 檢查用戶聊天渠道
router.post("/check-channel", async (req, res) => {
  try {
    let { channelUrl } = req.body;

    const match = await MatchNewest.findOne({
      sendbirdUrl: channelUrl,
    });

    let { chatCover } = await Config.findOne({});

    if (match != null) {
      if (match.isChecked) {
        return res.status(200).send({
          status: true,
          message: "這個渠道已經檢查過嚕！",
          validCode: "1",
        });
      } else {
        //檢查渠道-> 先檢查是否存在,如果存在就刪掉重建 ,不存在就直接建立
        const channel = await sbUtil.isGroupChannelExist(channelUrl);

        if (channel) {
          // console.log("渠道存在！檢查背景圖片是不是預設，不是就更改");
          // const srcCover = channel.cover_url;
          // if (srcCover != chatCover) {
          //   // console.log("將背景改為預設");
          //   await sbUtil.updateGroupChannel(channelUrl, chatCover);
          // }
        } else {
          // console.log("渠道不存在！直接建立");
          await sbUtil.createGroupChannel(channelUrl, chatCover);
        }

        await MatchNewest.updateOne(
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
      }
    } else {
      return res.status(200).send({
        status: true,
        message: "這個配對渠道不存在！",
        validCode: "1",
      });
    }
  } catch (e) {
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
    let { gender, minAge, maxAge, region, needSameInterested } = req.body;

    let updateData = {
      objectCondition: {
        objectGender: gender,
        objectAge: {
          maxAge,
          minAge,
        },
      },
    };

    if (isSubscription && generalUtil.isNotNUllEmpty(region)) {
      updateData.objectCondition.objectRegion = region;
    }

    if (isSubscription && generalUtil.isNotNUllEmpty(needSameInterested)) {
      updateData.objectCondition.needSameInterested = needSameInterested;
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
    let { action, language } = req.body;

    if (action == "0") {
      const mapItem = (item) => ({
        itemID: item.itemID,
        description: language == "en" ? item.des_EN : item.des_ZH,
      });

      return res.status(200).send({
        status: true,
        message: "獲取可檢舉項目",
        data: {
          info: null,
          items: ReportReasons.map(mapItem),
        },
      });
    } else if (action == "1") {
      let { objectID, reasonItemID, content, photos } = req.body;
      let { userID } = req.user;

      const uuid = uuidv4(); // 生成 UUID v4

      // 查找對應的報告原因
      const reasonItemDes = ReportReasons.find(
        (r) => r.itemID == reasonItemID
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
      if (generalUtil.isNotNUllEmpty(photos)) {
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
    const { isSubscription, realVerifyStatus } = req.user;

    const data = await Sticker.find({ stickersAvailable: true }).sort({
      priority: -1,
    });

    const result = [];

    data.forEach((series) => {
      const handleSeries = {
        ...series._doc,
        isFreeToYou:
          series.stickersPlan == "F"
            ? //免費方案
              true
            : //真人驗證方案
            series.stickersPlan == "R"
            ? realVerifyStatus
            : //訂閱解鎖方案
              isSubscription,
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
      validCode: "-1",
      e,
    });
  }
});

//B-10 取得 OF 主題系列集
router.post("/get-topics", async (req, res) => {
  try {
    let { isSubscription, realVerifyStatus } = req.user;

    let { language } = req.body;

    let topics = await Topic.find({ topicAvailable: true }).sort({
      priority: -1,
    });

    let result = [];

    topics.forEach((topic) => {
      let nameInfo = TopicNames.find((item) => item.itemID == topic.topicID);
      let topicName = language == "en" ? nameInfo.des_EN : nameInfo.des_ZH;

      let temp = {
        ...topic._doc,
        topicName,
        isFreeToYou:
          topic.topicPlan == "F"
            ? //免費方案
              true
            : //真人驗證方案
            topic.topicPlan == "R"
            ? realVerifyStatus
            : //訂閱解鎖方案
              isSubscription,
      };

      delete temp._id;
      delete temp.__v;

      result.push(temp);
    });

    return res.status(200).send({
      status: true,
      message: "成功獲取主題系列集",
      validCode: "1",
      data: result,
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      validCode: "-1",
      e,
    });
  }
});

//B-11 編輯用戶個人資料
router.post("/edit-info", async (req, res) => {
  try {
    let { action, language } = req.body;
    let { userID } = req.user;

    //更改個人資料
    if (action == "1") {
      let {
        photos,
        name,
        region,
        mbti,
        question,
        interested,
        traits,
        friendMotive,
        values,
        realVerifyStatus,
      } = req.body;

      let updateData = {
        userAttribute: req.user.userAttribute,
      };

      //用戶基本資料
      if (generalUtil.isNotNUllEmpty(name)) {
        updateData.userName = name;
        //通知 sb 改名字
        await sbUtil.updateExistUser(userID, name, "");
      }

      if (generalUtil.isNotNUllEmpty(region)) {
        updateData.userRegion = region;
      }

      //真人驗證狀態
      if (realVerifyStatus != null) {
        updateData.realVerifyStatus = realVerifyStatus;
      }

      if (mbti != null) {
        updateData.userMBTI = mbti;
      }

      if (generalUtil.isNotNUllEmpty(question)) {
        updateData.userQuestion = question;
      }

      //照片集變更
      if (generalUtil.isNotNUllEmpty(photos)) {
        try {
          const photoArray = JSON.parse(photos);
          updateData.userPhotos = photoArray;

          //交叉比對原本照片和準備要更新的照片差異
          let { userPhotos } = req.user;

          let photosCheckResult = {
            resultCode: "100",
            resultReport: "This photo has been approved!",
          };

          //刪除照片操作(新的照片集比原本照片集少)
          if (photoArray.length < userPhotos.length) {
            //如果照片刪到只剩下一張,就會默認第一張是大頭照,此時就要檢查第一張是否是個人
            if (photoArray && photoArray.length == 1) {
              //檢查第一張照片是不是人
              const faceResult = await visionUtil.checkImageForHumanFace(
                photoArray[0]
              );
              if (!faceResult.isFace) {
                photosCheckResult.resultCode = "102";
                photosCheckResult.resultReport = faceResult.reason;

                return res.status(200).send({
                  status: true,
                  message: "照片審核不通過！",
                  validCode: "1",
                  data: { photosCheckResult, oriPhotos: userPhotos },
                });
              } else {
                //告知 SB 大頭貼要更新
                await sbUtil.updateExistUser(userID, "", photoArray[0]);
              }
            }

            const deleteImages = userPhotos.filter(
              (item) => !photoArray.includes(item)
            );

            if (deleteImages && deleteImages.length > 0) {
              storageUtil.deleteImages(deleteImages);
            }
          } else if (photoArray.length > userPhotos.length) {
            //新增照片操作(新的照片集比原本照片集多) => 檢查多出來的那一張是不是合規
            const addImages = photoArray.filter(
              (item) => !userPhotos.includes(item)
            );

            if (addImages && addImages.length > 0) {
              //檢查照片是否合乎規範
              const imageResult = await visionUtil.checkImageForIllegal(
                addImages[0]
              );

              if (!imageResult.isSafe) {
                photosCheckResult.resultCode = "101";
                photosCheckResult.resultReport = imageResult.reason;

                storageUtil.deleteImages([addImages[0]]);

                return res.status(200).send({
                  status: true,
                  message: "照片審核不通過！",
                  validCode: "1",
                  data: { photosCheckResult, oriPhotos: userPhotos },
                });
              }
            }
          } else if (photoArray.length == userPhotos.length) {
            //變更照片順序操作(新的照片集跟原本照片集一樣)=> 檢查第一張大頭貼是不是人
            if (photoArray && photoArray.length > 0) {
              //檢查第一張照片是不是人
              const faceResult = await visionUtil.checkImageForHumanFace(
                photoArray[0]
              );
              if (!faceResult.isFace) {
                photosCheckResult.resultCode = "102";
                photosCheckResult.resultReport = faceResult.reason;

                return res.status(200).send({
                  status: true,
                  message: "照片審核不通過！",
                  validCode: "1",
                  data: { photosCheckResult, oriPhotos: userPhotos },
                });
              } else {
                //告知 SB 大頭貼要更新
                await sbUtil.updateExistUser(userID, "", photoArray[0]);
              }
            }
          }
        } catch (e) {
          console.log("JSON 解析失敗:", e);
        }
      }

      //用戶屬性資料
      //什麼都沒選就是 "[]" ,"[1,2,3]"
      if (generalUtil.isNotNUllEmpty(traits)) {
        try {
          const traitArray = JSON.parse(traits);
          updateData.userAttribute.traits = traitArray;
        } catch (e) {
          console.log("JSON 解析失敗:", e);
        }
      }

      if (generalUtil.isNotNUllEmpty(friendMotive)) {
        try {
          const friendMotiveArray = JSON.parse(friendMotive);
          updateData.userAttribute.friendMotive = friendMotiveArray;
        } catch (e) {
          console.log("JSON 解析失敗:", e);
        }
      }

      if (generalUtil.isNotNUllEmpty(interested)) {
        try {
          const interestedArray = JSON.parse(interested);
          updateData.userAttribute.interested = interestedArray;
        } catch (e) {
          console.log("JSON 解析失敗:", e);
        }
      }

      if (generalUtil.isNotNUllEmpty(values)) {
        try {
          const valueArray = JSON.parse(values);
          updateData.userAttribute.values = valueArray;
        } catch (e) {
          console.log("JSON 解析失敗:", e);
        }
      }

      await User.updateOne(
        {
          userID,
        },
        {
          $set: updateData,
        }
      );

      //更改 sendbird 用戶暱稱
      if (generalUtil.isNotNUllEmpty(updateData.userName)) {
        await sendbirdUtil.createAndUpdateUser(userID, updateData.userName);
      }

      return res.status(200).send({
        status: true,
        message: "個人資料更新成功",
        validCode: "1",
      });
    }

    //讀取個人資料
    if (action == "0") {
      let {
        userPhotos,
        userName,
        userRegion,
        userMBTI,
        userQuestion,
        realVerifyStatus,
        userAttribute: { interested, traits, friendMotive, values },
      } = req.user;

      let output = {
        userPhotos,
        userName,
        userRegion,
        userMBTI,
        userQuestion,
        realVerifyStatus,
        interested: [],
        traits: [],
        friendMotive: [],
        values: [],
        interestedItems: [],
        traitsItems: [],
        friendMotiveItems: [],
        valueItems: [],
      };

      const mapItem = (item) => ({
        itemID: item.itemID,
        description: language == "en" ? item.des_EN : item.des_ZH,
        isSelect: true,
      });

      //輸出用戶個人標籤資料
      //用戶選擇的興趣
      if (interested != null && interested.length > 0) {
        //提取用戶的興趣
        output.interested = Interesteds.filter((item) =>
          interested.includes(item.itemID)
        ) // 過濾出與興趣陣列相符的項目
          .map(mapItem);
      }

      //比對所有興趣項目與用戶選擇的興趣
      output.interestedItems = Interesteds.map((item) => ({
        itemID: item.itemID,
        description: language == "en" ? item.des_EN : item.des_ZH,
        isSelect: interested.includes(item.itemID),
      }));

      //個人特質
      if (traits != null && traits.length > 0) {
        //提取用戶的個人特質
        output.traits = Traits.filter((item) =>
          traits.includes(item.itemID)
        ).map(mapItem);
      }

      //比對所有個人特質與個人特質的興趣
      output.traitsItems = Traits.map((item) => ({
        itemID: item.itemID,
        description: language == "en" ? item.des_EN : item.des_ZH,
        isSelect: traits.includes(item.itemID),
      }));

      //交友動機
      if (friendMotive != null && friendMotive.length > 0) {
        //提取用戶的個人特質
        output.friendMotive = FriendMotives.filter((item) =>
          friendMotive.includes(item.itemID)
        ).map(mapItem);
      }

      //比對所有個人特質與個人特質的興趣
      output.friendMotiveItems = FriendMotives.map((item) => ({
        itemID: item.itemID,
        description: language == "en" ? item.des_EN : item.des_ZH,
        isSelect: friendMotive.includes(item.itemID),
      }));

      //價值觀
      if (values != null && values.length > 0) {
        //提取用戶的價值觀
        output.values = Values.filter((item) =>
          values.includes(item.itemID)
        ).map(mapItem);
      }

      output.valueItems = Values.map((item) => ({
        itemID: item.itemID,
        description: language == "en" ? item.des_EN : item.des_ZH,
        isSelect: values.includes(item.itemID),
      }));

      return res.status(200).send({
        status: true,
        message: "成功獲取個人資料",
        validCode: "1",
        data: output,
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

//B-12 讀取指定用戶個人簡易資料
router.post("/simple-info", async (req, res) => {
  try {
    let { userID } = req.user;

    //指定對象ID ,語系:zh , en
    let { targetUserID, language } = req.body;

    //先判斷 targetUserID 是不是用戶自己,如果不是,就是對象,就要給好感度
    const targetInfo = await User.findOne({ userID: targetUserID });

    //指定用戶的資訊
    let {
      userPhotos,
      userName,
      userGender,
      userZodiac,
      userRegion,
      userMBTI,
      userAttribute: { interested, traits, friendMotive, values },
      userQuestion,
      realVerifyStatus,
      isSubscription,
    } = targetInfo;

    //輸出的資料
    let output = {
      userPhotos: [],
      userName,
      userID: "",
      userGender,
      userZodiac,
      userRegion,
      userMBTI,
      userQuestion,
      userPhoto: "",
      realVerifyStatus,
      isSubscription,
      likeLevel: 1,
      interested: [],
      traits: [],
      friendMotive: [],
      values: [],
    };

    if (userID == targetUserID) {
      //看自己
      output.userID = userID;
      output.likeLevel = 3;
    } else {
      //看別人
      output.userID = targetUserID;

      //我對別人的好感度累積 level
      if (req.user.isSubscription) {
        //如果你看別人～但是你有訂閱～那level就是3
        output.likeLevel = 3;
      } else {
        const relation = await UserRelation.findOne({ userID });

        if (relation) {
          const {
            objectActive: { likeObjects },
          } = relation;

          if (likeObjects && likeObjects.length != 0) {
            let foundObject = likeObjects.find(
              (obj) => obj.objectID === targetUserID
            );

            if (foundObject) {
              //我累積該用戶的好感度
              output.likeLevel = foundObject.likeLevel;
            }
          }
        }
      }
    }

    //檢查用戶照片集及大頭貼
    if (userPhotos && userPhotos.length > 0) {
      output.userPhotos = userPhotos;
      output.userPhoto = userPhotos[0];
    }

    //目標用戶個性屬性標籤
    //屬性標籤過濾方法
    const mapItem = (item) => ({
      itemID: item.itemID,
      description: language == "en" ? item.des_EN : item.des_ZH,
      isSelect: true,
    });

    //興趣
    if (interested != null && interested.length > 0) {
      //提取用戶的興趣
      output.interested = Interesteds.filter((item) =>
        interested.includes(item.itemID)
      ) // 過濾出與興趣陣列相符的項目
        .map(mapItem);
    }

    //個人特質
    if (traits != null && traits.length > 0) {
      //提取用戶的個人特質
      output.traits = Traits.filter((item) => traits.includes(item.itemID)).map(
        mapItem
      );
    }

    //交友動機
    if (friendMotive != null && friendMotive.length > 0) {
      //提取用戶的個人特質
      output.friendMotive = FriendMotives.filter((item) =>
        friendMotive.includes(item.itemID)
      ).map(mapItem);
    }

    //價值觀
    if (values != null && values.length > 0) {
      //提取用戶的價值觀
      output.values = Values.filter((item) => values.includes(item.itemID)).map(
        mapItem
      );
    }

    return res.status(200).send({
      status: true,
      message:
        userID == targetUserID
          ? "成功獲取自己的簡易資料"
          : "成功獲取目標對象的簡易資料",
      validCode: "1",
      data: output,
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});

//B-13 變更聊天室主題
router.post("/crud-chatopic", async (req, res) => {
  try {
    let { action, topicID, sendbirdUrl } = req.body;

    if (action == "0") {
      const match = await MatchNewest.findOne({
        sendbirdUrl,
      });

      res.status(200).send({
        status: true,
        message: match ? "查詢指定渠道主題" : "指定渠道不存在",
        validCode: "1",
        data: {
          topicID: match.topicID,
          topicBackGround: match.topicBackGround,
          topicColors: match.topicColors,
        },
      });
    } else {
      const topic = await Topic.findOne({
        topicID,
      });

      if (topic) {
        const data = await MatchNewest.updateOne(
          {
            sendbirdUrl,
          },
          {
            topicID: topic.topicID,
            topicBackGround: topic.topicBackGround,
            topicColors: topic.topicColors,
          }
        );

        res.status(200).send({
          status: true,
          validCode: "1",
          message: data.modifiedCount > 0 ? "修改成功！" : "沒有修改",
        });
      } else {
        res.status(200).send({
          status: true,
          message: "查無此主題！",
          validCode: "1",
        });
      }
    }
  } catch (e) {
    res.status(500).send({
      status: false,
      message: "Server Error!",
      validCode: "-1",
      e,
    });
  }
});

//B-14 快速查看配對對象的資訊
router.post("/query-match-object", async (req, res) => {
  try {
    //指定配對對象ID
    let { sendbirdUrl } = req.body;
    let { userID, isSubscription } = req.user;

    //是否接近午夜
    const diffNight = dateUtil.getTomorrowNight() - Date.now();
    const isCloseNight = diffNight <= 30 * 60 * 1000 && diffNight > 0;

    //獲取指定渠道的配對資訊
    const match = await MatchNewest.findOne({
      sendbirdUrl,
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
      ]);

    if (match) {
      let objectInfo =
        match.user1ID === userID ? match.user2_ID : match.user1_ID;

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

      let outData = {
        uiType: match.matchUIType,
        userID: objectInfo.userID,
        userName: objectInfo.userName,
        userQuestion: objectInfo.userQuestion,
        userPhoto: "",
        notificationStatus: objectInfo.notificationStatus,
        sendbirdUrl: match.sendbirdUrl,
        isChecked: match.isChecked,
        likeLevel: 1,
        letterYourContent: "",
        letterObjectContent: "",
        topicID: match.topicID,
        topicBackGround: match.topicBackGround,
        topicColors: match.topicColors,
      };

      //一般配對
      //提取對象的照片集第一張作為對象頭貼
      if (objectInfo.userPhotos && objectInfo.userPhotos.length > 0) {
        outData.userPhoto = objectInfo.userPhotos[0];
      }

      //提取與對象的好感度LikeLevel
      let foundObject = signObjects.find(
        (obj) => obj.objectID === objectInfo.userID
      );

      if (foundObject) {
        //輸出對象的好感度標記
        outData.likeLevel = foundObject.likeLevel || 1;
      }

      if (isSubscription) {
        //如果有訂閱,直接最高等級
        outData.likeLevel = 3;
      }

      return res.status(200).send({
        status: true,
        message: "成功獲取指定配對資訊",
        validCode: "1",
        data: {
          isCloseNight,
          openChannelUrl: "onlyfriends_announcement_channel",
          matches: [outData],
        },
      });
    } else {
      return res.status(200).send({
        status: true,
        message: "查無指定配對資訊",
        validCode: "1",
        data: {
          isCloseNight,
          openChannelUrl: "onlyfriends_announcement_channel",
          matches: [],
        },
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

//B-15 使用兌換碼
router.post("/use-promotion-code", async (req, res) => {
  try {
    //兌換有以下狀態 : 查無此兌換碼(-1) / 兌換成功(1) / 已兌換完畢(2) / 已超過兌換期限(3) / 您已經訂閱(4) /
    //兌換失敗！(0)
    const { userID, isSubscription } = req.user;
    const { promotionCode } = req.body;

    //確認用戶給的兌換碼是否存在且沒有過期
    //找出這個兌換碼的 ID
    const promoterUser = await PromoterUser.findOne(
      { promotionCode },
      { activityID: 1, promoterID: 1, _id: 0 }
    );

    //抓出這個活動的截止資訊
    const promoteActivity = await PromotionActivity.findOne(
      {
        activityID: promoterUser.activityID,
      },
      { activityEndTime: 1, activityID: 1, _id: 0 }
    );

    //是否過期
    const isExpired = Date.now() >= promoteActivity.activityEndTime;
    //是否活動存在
    const isActivityExist = promoteActivity != null;

    if (!isActivityExist || isExpired) {
      return res.status(200).send({
        status: true,
        message: isExpired
          ? "很抱歉！該推廣活動兌換碼已過期！"
          : "很抱歉！查無此推廣活動",
        validCode: "1",
        data: {
          queryCode: isExpired ? "3" : "-1",
          //promotionType 就是 activityID => 這是當初設計的殘黨
          promotionType: promoteActivity.activityID,
        },
      });
    }

    //檢查是否兌換完畢
    //activityID = 100 => 聯盟行銷活動  | activitID =? => ?
    if (promoteActivity.activityID == "100") {
      //這個活動的推廣者不能再是被推廣者=> 推廣者不能兌換這個活動
      const isCurrentIsPromoter = await PromoterUser.findOne({
        promoterID: userID,
        activityID: promoteActivity.activityID,
      });

      if (isCurrentIsPromoter) {
        return res.status(200).send({
          status: true,
          message: "兌換失敗！活動推廣者不能兌換！",
          validCode: "1",
          data: {
            //先用 -1 , 以後改為 5 ==> 因為 iOS 會爆炸
            queryCode: "-1",
            promotionType: promoteActivity.activityID,
          },
        });
      }

      //查詢該用戶是不是已經是被推廣者,如果是,表示他已經兌換過勒
      const findReferal = await ReferalUser.findOne({
        referalUserID: userID,
      });

      //已經兌換過勒
      if (findReferal) {
        return res.status(200).send({
          status: true,
          message: "該推廣活動兌換碼已兌換過嚕！",
          validCode: "1",
          data: {
            queryCode: "2",
            promotionType: promoteActivity.activityID,
          },
        });
      } else {
        //尚未兌換
        //如果是訂閱用戶,就不能兌換兩週適用
        if (isSubscription) {
          return res.status(200).send({
            status: true,
            message: "兌換失敗！您已經是訂閱會員了！",
            validCode: "1",
            data: {
              queryCode: "4",
              promotionType: promoteActivity.activityID,
            },
          });
        }

        //在這個活動兌換就會變成被推廣者=>如果後續有訂閱,部分訂閱收益就會算給推廣者
        //允許用戶試用兩週,直接通知前端結果
        let future = new Date(); // 未來截止台灣時間

        future.setDate(new Date().getDate() + 14); // 加上 14 天
        future.setHours(23, 59, 59, 999);

        // 輸出成 "YYYY/MM/DD" 格式
        const formattedExpireDate = `${future.getFullYear()}/${String(
          future.getMonth() + 1
        ).padStart(2, "0")}/${String(future.getDate()).padStart(2, "0")}`;

        //標記指定用戶已經訂閱
        await User.updateOne(
          {
            userID,
          },
          {
            isSubscription: true,
            isPromotionSub: true,
            subExpiresDate: formattedExpireDate,
          }
        );

        res.status(200).send({
          status: true,
          message: "兌換成功！獲得免費試用兩週",
          validCode: "1",
          data: {
            queryCode: "1",
            promotionType: promoteActivity.activityID,
          },
        });

        //建立被推廣者
        let { userName, userGender, userAge, userZodiac, userRegion, osType } =
          req.user;

        await ReferalUser.create({
          promoterID: promoterUser.promoterID,
          activityID: promoteActivity.activityID,
          referalUserID: userID,
          referalUserName: userName,
          referalUserGender: userGender,
          referalUserAge: userAge,
          referalUserZodiac: userZodiac,
          referalUserRegion: userRegion,
          referalosOSType: osType,
          freeSubExpiresDate: formattedExpireDate,
        });

        //將 被推廣者 歸入 推廣者 旗下
        await PromoterUser.findOneAndUpdate(
          { promoterID: promoterUser.promoterID },
          {
            $addToSet: {
              referralUsers: {
                referralUserID: userID,
              },
            },
          },
          { new: true }
        );
      }
    }
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      validCode: "-1",
      e,
    });
  }
});

//B-100 申請加入推廣者
router.post("/apply-promoter", async (req, res) => {
  try {
    let { identity } = req.user;
    let { activityID, userID } = req.body;

    if (identity != 1) {
      return res.status(200).send({
        status: true,
        message: "很抱歉！僅有官方人員才可以遞交申請文件！",
        validCode: "1",
        data: {
          queryCode: "-3",
        },
      });
    }

    const findUser = await User.findOne({ userID });

    //查無該名使用者
    if (findUser == null) {
      return res.status(200).send({
        status: true,
        message: "查無指定用戶！請先註冊 OnlyFriends",
        validCode: "1",
        data: {
          queryCode: "-1",
        },
      });
    }

    const findActivity = await PromotionActivity.findOne({
      activityID,
    });

    //查無推廣促銷活動
    if (!findActivity) {
      return res.status(200).send({
        status: true,
        message: "很抱歉！您想申請的促銷活動不存在！",
        validCode: "1",
        data: {
          queryCode: "-2",
        },
      });
    }

    //查詢是否已經是這個活動的推廣者
    const findPromoter = await PromoterUser.findOne({
      promoterID: userID,
      activityID,
    });

    if (findPromoter) {
      //已經是推廣者
      return res.status(200).send({
        status: true,
        message: "你已經是推廣者！不用再申請勒！",
        validCode: "1",
        data: {
          queryCode: "1",
          activityID,
          promotionCode: findPromoter.promotionCode,
          promoterID: findPromoter.promoterID,
        },
      });
    } else {
      //建立推廣碼
      const code = uuidv4().replace(/-/g, "").toUpperCase().slice(0, 10);

      //建立推廣者
      await PromoterUser.create({
        activityID,
        promoterID: userID,
        promotionCode: code,
        referralUsers: [],
      });

      //將新建立的推廣者加入這個促銷活動項目
      await PromotionActivity.findOneAndUpdate(
        { activityID },
        {
          $addToSet: {
            promoters: {
              promoterID: userID,
              promotionCode: code,
            },
          },
        },
        { new: true }
      );

      //成功成為推廣者,可以獲得一個月的免費試用,如果已經訂閱則不提供
      const isSubscription = findUser.isSubscription;

      if (!isSubscription) {
        let future = new Date(); // 未來截止台灣時間

        future.setDate(new Date().getDate() + 30); // 加上 30 天
        future.setHours(23, 59, 59, 999);

        // 輸出成 "YYYY/MM/DD" 格式
        const formattedExpireDate = `${future.getFullYear()}/${String(
          future.getMonth() + 1
        ).padStart(2, "0")}/${String(future.getDate()).padStart(2, "0")}`;

        //標記指定用戶已經訂閱
        await User.updateOne(
          {
            userID,
          },
          {
            isSubscription: true,
            isPromotionSub: true,
            subExpiresDate: formattedExpireDate,
          }
        );
      }

      return res.status(200).send({
        status: true,
        message: "恭喜您！成功申請成為 OnlyFriends 推廣者",
        validCode: "1",
        data: {
          queryCode: "2",
          promoterID: userID,
          promotionCode: code,
        },
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

//B-101 分析推廣數據
router.post("/ana-promoter-data", async (req, res) => {
  try {
    const {
      activityID,
      promoterID,
      startDateTime,
      endDateTime,
      isPromoterMode,
    } = req.body;

    //分析結果
    const result = {
      promoterID: "",
      promotionCode: "",
      referalCounts: 0, //推廣兌換數=>就是被推廣者總數
      referalSubCounts: 0, //推廣訂閱數=>就是被推廣者試用後,訂閱的數量
      referalSubRate: 0, //兌換訂閱轉換率
      totalIncome: 0, //推廣預估總收益
      shareIncome: 0, //推廣分潤收益
      shareRate: 2, //聯盟分潤
      monthlyCounts: 0, //月訂閱比例
      quarterlyCounts: 0, //季訂閱比例
      annualCounts: 0, //年訂閱比例
      referalGenderAgeArea: {},
      // referalAgeArea: {},
      subGenderAgeArea: {},
      // subAgeArea: {},
    };

    //目標被推廣者們
    let referralUserIDsArr = [];

    if (isPromoterMode == "1") {
      //指定推廣者數據模式
      //找出推廣者底下的被推廣者ID
      const findPromoter = await PromoterUser.findOne({
        activityID,
        promoterID,
      });

      if (!findPromoter) {
        return res.status(200).send({
          status: true,
          message: "數據分析失敗",
          validCode: "1",
          data: {
            resultCode: -1,
          },
        });
      }

      //輸出推廣者資訊
      result.promoterID = findPromoter.promoterID;
      result.promotionCode = findPromoter.promotionCode;

      const referralUserIDs = findPromoter.referralUsers;
      //取出被推廣者的IDs
      referralUserIDsArr = referralUserIDs.map((item) => item.referralUserID);
    } else {
      //非指定推廣者數據模式
      const referralUsers = await ReferalUser.find(
        {
          activityID,
        },
        { referalUserID: 1 }
      );

      referralUserIDsArr = referralUsers.map((item) => item.referalUserID);
    }

    //找出這些被推廣者的訂閱訂單,以利後續分析
    const transactions = await Transcation.find(
      {
        userID: { $in: referralUserIDsArr },
        startDate: { $gte: startDateTime, $lte: endDateTime },
        status: { $in: ["active", "expired"] },
      },
      {
        userID: 1,
        userEmail: 1,
        osType: 1,
        startDate: 1,
        expiresDate: 1,
        price: 1,
        status: 1,
      }
    );

    //計算推廣兌換總數
    result.referalCounts = referralUserIDsArr
      ? referralUserIDsArr.length.toLocaleString()
      : 0;

    //計算推廣訂閱總數
    result.referalSubCounts = transactions
      ? transactions.length.toLocaleString()
      : 0;

    //計算兌換訂閱轉換率
    let tmpRate =
      result.referalCounts > 0
        ? result.referalSubCounts / result.referalCounts
        : 0;

    result.referalSubRate = Math.round(tmpRate * 100);

    //計算總收益及訂閱項目比例
    if (transactions && transactions.length > 0) {
      let total = 0;
      let annual = 0,
        quarterly = 0,
        monthly = 0;

      for (let transaction of transactions) {
        total += transaction.price;

        if (transaction.price == 550) {
          monthly += 1;
        } else if (price == 350) {
          quarterly += 1;
        } else {
          annual += 1;
        }
      }

      result.totalIncome = total;
      result.monthlyCounts = monthly;
      result.quarterlyCounts = quarterly;
      result.annualCounts = annual;
    }

    //計算聯盟分潤比例
    let subs = result.referalSubCounts;
    result.shareRate = subs >= 300 ? 5 : subs >= 150 ? 4 : subs >= 50 ? 3 : 2;

    //計算聯盟分潤
    result.shareIncome = Math.round(
      (result.totalIncome * result.shareRate) / 100
    ).toLocaleString();
    result.totalIncome = result.totalIncome.toLocaleString();

    //取出推廣者的用戶資料(輸出年齡和性別)
    const referalUserInfos = await User.find(
      {
        userID: { $in: referralUserIDsArr },
      },
      { userGender: 1, userAge: 1 }
    );

    //計算被推廣者性別比例
    const referalAummary = summarizeGenderAndAge(referalUserInfos);
    // result.referalGenderArea = referalAummary.genderArea;
    // result.referalAgeArea = referalAummary.ageGroups;
    result.referalGenderAgeArea = referalAummary;

    //取出訂閱者的用戶資料(輸出年齡和性別)
    const subUserIDs = [...new Set(transactions.map((t) => t.userID))];
    const subUserInfos = await User.find(
      {
        userID: { $in: subUserIDs },
      },
      { userGender: 1, userAge: 1 }
    );

    //計算訂閱者性別比例
    const subSummary = summarizeGenderAndAge(subUserInfos);
    result.subGenderAgeArea = subSummary;
    // result.subGenderArea = subSummary.genderArea;
    // result.subAgeArea = subSummary.ageGroups;

    return res.status(200).send({
      status: true,
      message: "數據分析完成",
      validCode: "1",
      data: {
        resultCode: 1,
        result,
      },
    });
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      validCode: "-1",
      e,
    });
  }
});

//計算用戶們的性別和年齡分佈
// function summarizeGenderAndAge(users) {
//   const genderArea = { female: 0, male: 0, special: 0 };

//   // 先建立 0-9, 10-19, ..., 90-99, 100+ 的區間，初始數量都設為 0
//   const ageGroups = {};
//   for (let start = 0; start <= 90; start += 10) {
//     const end = start + 9;
//     const key = `${start}-${end}`;
//     ageGroups[key] = 0;
//   }
//   ageGroups["100+"] = 0; // 100 歲以上區間

//   users.forEach((user) => {
//     // 性別計數
//     if (user.userGender === "1") {
//       genderArea.male += 1;
//     } else if (user.userGender === "0") {
//       genderArea.female += 1;
//     } else if (user.userGender === "2") {
//       genderArea.special += 1;
//     }

//     // 年齡區間計數
//     if (typeof user.userAge === "number" && user.userAge >= 0) {
//       if (user.userAge >= 100) {
//         ageGroups["100+"] += 1;
//       } else {
//         const start = Math.floor(user.userAge / 10) * 10;
//         const key = `${start}-${start + 9}`;
//         ageGroups[key] += 1;
//       }
//     }
//   });

//   return { genderArea, ageGroups };
// }

function summarizeGenderAndAge(users) {
  const genderArea = { female: 0, male: 0, special: 0 };

  // 建立年齡區間標籤（0-9、10-19、...、90-99、100+）
  const ageLabels = [];
  for (let start = 0; start <= 90; start += 10) {
    ageLabels.push(`${start}-${start + 9}`);
  }
  ageLabels.push("100+");

  // 初始化三組陣列，長度與 ageLabels 一樣，初始都為 0
  const maleData = new Array(ageLabels.length).fill(0);
  const femaleData = new Array(ageLabels.length).fill(0);
  const specialData = new Array(ageLabels.length).fill(0);

  users.forEach((user) => {
    // 性別計數
    if (user.userGender === "1") {
      genderArea.male += 1;
    } else if (user.userGender === "0") {
      genderArea.female += 1;
    } else if (user.userGender === "2") {
      genderArea.special += 1;
    }

    // 年齡區間計數
    if (typeof user.userAge === "number" && user.userAge >= 0) {
      let idx;
      if (user.userAge >= 100) {
        idx = ageLabels.indexOf("100+");
      } else {
        const start = Math.floor(user.userAge / 10) * 10;
        idx = ageLabels.indexOf(`${start}-${start + 9}`);
      }

      if (idx !== -1) {
        if (user.userGender === "1") {
          maleData[idx]++;
        } else if (user.userGender === "0") {
          femaleData[idx]++;
        } else if (user.userGender === "2") {
          specialData[idx]++;
        }
      }
    }
  });

  return { genderArea, maleData, femaleData, specialData, ageLabels };
}

//計算用戶的性別分佈
function summarizeGender(users) {
  const genderArea = { female: 0, male: 0, special: 0 };

  users.forEach((user) => {
    // 性別計數
    if (user.userGender === "1") {
      genderArea.male += 1;
    } else if (user.userGender === "0") {
      genderArea.female += 1;
    } else if (user.userGender === "2") {
      genderArea.special += 1;
    }
  });

  return { genderArea };
}

//B-15 使用兌換碼
// router.post("/use-promotion-code", async (req, res) => {
//   try {
//     //兌換有以下狀態 : 查無此兌換碼(-1) / 已兌換完畢(2) / 已超過兌換期限(3) / 兌換成功(1) / 您已經訂閱(4)
//     const { userID, isSubscription } = req.user;
//     const { promotionCode } = req.body;

//     //每一個推廣碼都有對應的推廣類型
//     const code = await PromotionCode.findOne({ promotionCode });

//     if (code) {
//       // 確認有這個兌換碼
//       // 已兌換完畢
//       const stub = await PromotionStub.findOne({
//         userID,
//         promotionType: code.promotionType,
//       });

//       if (stub) {
//         return res.status(200).send({
//           status: true,
//           message: "您已經兌換過了",
//           validCode: "1",
//           data: {
//             queryCode: "2",
//             promotionType: code.promotionType,
//           },
//         });
//       } else {
//         // 確認是否在兌換期限
//         const now = new Date();
//         const start = new Date(code.promotionStart);
//         const end = new Date(code.promotionExpired);

//         if (now >= start && now <= end) {
//           //允許兌換
//           //確定兌換項目
//           let future = new Date(); // 未來截止時間

//           if (code.promotionType == "100") {
//             //免費試用兩週
//             if (isSubscription) {
//               return res.status(200).send({
//                 status: true,
//                 message: "兌換失敗！您已經是訂閱會員了！",
//                 validCode: "1",
//                 data: {
//                   queryCode: "4",
//                   promotionType: code.promotionType,
//                 },
//               });
//             }

//             future.setDate(now.getDate() + 14); // 加上 14 天
//             future.setHours(23, 59, 59, 999);

//             // 輸出成 "YYYY/MM/DD" 格式
//             const formattedExpireDate = `${future.getFullYear()}/${String(
//               future.getMonth() + 1
//             ).padStart(2, "0")}/${String(future.getDate()).padStart(2, "0")}`;

//             //標記指定用戶已經訂閱
//             await User.updateOne(
//               {
//                 userID,
//               },
//               {
//                 isSubscription: true,
//                 isPromotionSub: true,
//                 subExpiresDate: formattedExpireDate,
//               }
//             );
//           }

//           await PromotionStub.create({
//             agentUserID: code.agentUserID,
//             userID,
//             promotionType: code.promotionType,
//             expiredDate: future,
//             ticketStubStatus: "1",
//           });

//           return res.status(200).send({
//             status: true,
//             message: "兌換成功！免費試用兩週",
//             validCode: "1",
//             data: {
//               queryCode: "1",
//               promotionType: code.promotionType,
//             },
//           });
//         } else {
//           //尚未開放兌換
//           if (now < start) {
//             return res.status(200).send({
//               status: true,
//               message: "目前促銷活動尚未開放",
//             });
//           } else if (now > end) {
//             //已超過兌換期限
//             return res.status(200).send({
//               status: true,
//               message: "已超過兌換期限",
//               validCode: "1",
//               data: {
//                 queryCode: "3",
//                 promotionType: code.promotionType,
//               },
//             });
//           }
//         }
//       }
//     } else {
//       // 查無此兌換碼
//       return res.status(200).send({
//         status: true,
//         message: "查無此兌換碼",
//         validCode: "1",
//         data: {
//           queryCode: "-1",
//           promotionType: null,
//         },
//       });
//     }
//   } catch (e) {
//     return res.status(500).send({
//       status: false,
//       message: "Server Error!",
//       validCode: "-1",
//       e,
//     });
//   }
// });
module.exports = router;
