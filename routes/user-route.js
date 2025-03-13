const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");

const User = require("../models").user;
const UserRelation = require("../models").userRelation;
const MatchNewest = require("../models").matchNewest;
const Config = require("../models").config;
const Report = require("../models").report;
const Sticker = require("../models").sticker;
const Topic = require("../models").topic;
const { TopicNames } = require("../config/enum");

const dateUtil = require("../utils/date-util");
const storageUtil = require("../utils/cloudStorage-util");
const sendbirdUtil = require("../utils/sendbird-util");
const sbUtil = require("../utils/sendbird-util");
const generalUtil = require("../utils/general-util");
const passport = require("passport");
const dotenv = require("dotenv");
dotenv.config();

const {
  ReportReasons,
  Interesteds,
  Traits,
  FriendMotives,
  Values,
} = require("../config/enum");

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
    const diffNight = dateUtil.getTomorrowNight() - Date.now();
    const isCloseNight = diffNight <= 30 * 60 * 1000 && diffNight > 0;

    //獲取今天所有配對
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
      ])
      .populate("user2_ID", [
        "userName",
        "userID",
        "userPhotos",
        "userQuestion",
        "realVerifyStatus",
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

    if (isSubscription && generalUtil.isNotNUllEmpty(region)) {
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
      validCode: "-1",
      e,
    });
  }
});

//B-10 取得 OF 主題系列集
router.post("/get-topics", async (req, res) => {
  try {
    let { isSubscription } = req.user;
    let { language } = req.body;
    let topics = await Topic.find({}).sort({ priority: -1 });

    let result = [];

    topics.forEach((topic) => {
      let nameInfo = TopicNames.find((item) => item.itemID == topic.topicID);
      let topicName = language == "en" ? nameInfo.des_EN : nameInfo.des_ZH;

      let temp = {
        ...topic._doc,
        isFreeToYou: isSubscription ? true : topic.topicPlan == "F",
        topicName,
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
    console.log(e);
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

      if (generalUtil.isNotNUllEmpty(photos)) {
        try {
          const photoArray = JSON.parse(photos);
          updateData.userPhotos = photoArray;

          //交叉比對原本照片和準備要更新的照片差異
          let { userPhotos } = req.user;

          const diffImages = userPhotos.filter(
            (item) => !photoArray.includes(item)
          );

          storageUtil.deleteImages(diffImages);
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
module.exports = router;
