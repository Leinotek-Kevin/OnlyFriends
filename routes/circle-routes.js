const router = require("express").Router();
const passport = require("passport");
const dotenv = require("dotenv");
dotenv.config();

const CircleTicket = require("../models").circleTicket;
const ActivityCircle = require("../models").activityCircle;
const ReadyCircle = require("../models").readyCircle;
const User = require("../models").user;
const { v4: uuidv4 } = require("uuid");

const { CircleTopicNames } = require("../config/enum");

router.use((req, res, next) => {
  console.log("正在接收一個跟 circle 有關的請求");
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

//E-1 圈圈服務台
router.post("/circle-npc", async (req, res) => {
  try {
    const { userID } = req.user;

    //目前圈圈報名系統狀態碼
    //0:尚未開放報名 1:開放報名 2:報名已截止 3:圈圈群聊中
    const statusMap = [
      //星期日
      { statusCode: 0, text: "尚未開放報名" },
      //星期一
      { statusCode: 1, text: "開放報名" },
      { statusCode: 1, text: "開放報名" },
      { statusCode: 1, text: "開放報名" },
      { statusCode: 2, text: "階段鎖定" },
      { statusCode: 3, text: "活動中" },
      { statusCode: 0, text: "尚未開放報名" },
    ];

    //今天星期幾
    const now = Date.now();
    const isNewDuration = now > 1745769600000 && now < 1748534400000;
    const day = new Date(Date.now()).getDay();

    //目前系統圈圈活動的狀態
    const circleStatusCode = statusMap[day];
    //查詢用戶是否已經參加主題圈圈(是否擁有圈圈門票)
    const ticket = await CircleTicket.findOne({ ticketOwnerID: userID });

    //詢問結果 circleChannelID : circleTopicID + "_" + circleGroupID
    const result = {
      day,
      isNewDuration,
      content: "尚未開放報名",
      contentID: "0",
      canJoin: false,
      circleChannelID: "",
      everChoose: false,
      chooseCircleTopicID: "",
    };

    if (ticket) {
      result.everChoose = true;
      result.chooseCircleTopicID = ticket.circleTopicID;
      result.circleChannelID = ticket.circleChannelID;
    }

    if (circleStatusCode.statusCode == 0) {
      //系統尚未開放報名(六,日)
      result.content =
        ticket == null ? "尚未開放報名" : "請把握保留的圈圈聊天喔！";
      result.contentID = ticket == null ? "0" : "3";
      result.canJoin = ticket != null;
    } else if (circleStatusCode.statusCode == 1) {
      //開放報名(一,二,三)
      result.contentID = "1";
      result.content = "開放報名";
    } else if (circleStatusCode.statusCode == 2) {
      //階段鎖定(四)
      result.contentID = "2";
      result.content = "階段已鎖定";
    } else if (circleStatusCode.statusCode == 3) {
      //活動中(五)
      result.content =
        ticket == null ? "尚未開放報名" : "圈圈聊天已開始！請好好把握喔！";
      result.contentID = ticket == null ? "0" : "3";
      result.canJoin = ticket != null;
    }

    return res.status(200).send({
      status: true,
      message: "以下是您的查詢結果",
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

//E-2 顯示所有主題圈圈
router.post("/show-circles", async (req, res) => {
  try {
    const { userID } = req.user;
    const { language } = req.body;

    const ticket = await CircleTicket.findOne({ ticketOwnerID: userID });

    const readyCircles = await ReadyCircle.find(
      {},
      { circleTopicID: 1, _id: 0 }
    ).sort({
      cumulativeCounts: -1,
    });

    // 將 "random" 的元素挑出來放到最前面
    const randomItem = readyCircles.find(
      (item) => item.circleTopicID === "random"
    );
    const otherItems = readyCircles.filter(
      (item) => item.circleTopicID !== "random"
    );

    const sortCircles = [randomItem, ...otherItems];

    const finalCicles = sortCircles.map((circle) => {
      const circleTopicEnum = CircleTopicNames.find(
        (item) => item.itemID === circle.circleTopicID
      );

      return {
        circleTopicID: circle.circleTopicID,
        description:
          language == "en" ? circleTopicEnum.des_EN : circleTopicEnum.des_ZH,
        isChoose: ticket ? circle.circleTopicID == ticket.circleTopicID : false,
      };
    });

    //目前圈圈報名系統狀態碼
    //0:尚未開放報名 1:開放報名 2:報名已截止 3:圈圈群聊中
    const statusMap = [
      //星期日
      { statusCode: 0, text: "尚未開放報名" },
      //星期一
      { statusCode: 1, text: "開放報名" },
      { statusCode: 1, text: "開放報名" },
      { statusCode: 1, text: "開放報名" },
      { statusCode: 2, text: "階段鎖定" },
      { statusCode: 3, text: "活動中" },
      { statusCode: 0, text: "尚未開放報名" },
    ];

    //今天星期幾
    const day = new Date(Date.now()).getDay();

    //目前系統圈圈活動的狀態
    const circleStatusCode = statusMap[day];

    let content = "尚未開放報名";
    let contentID = "0";

    if (circleStatusCode.statusCode == 0) {
      //系統尚未開放報名(六,日)
      content = ticket == null ? "尚未開放報名" : "請把握保留的圈圈聊天喔！";
      contentID = ticket == null ? "0" : "3";
    } else if (circleStatusCode.statusCode == 1) {
      //開放報名(一,二,三)
      contentID = "1";
      content = "開放報名";
    } else if (circleStatusCode.statusCode == 2) {
      //階段鎖定(四)
      contentID = "2";
      content = "階段已鎖定";
    } else if (circleStatusCode.statusCode == 3) {
      //活動中(五)
      content =
        ticket == null ? "尚未開放報名" : "圈圈聊天已開始！請好好把握喔！";
      contentID = ticket == null ? "0" : "3";
    }

    return res.status(200).send({
      status: true,
      message: "顯示所有主題圈圈列表",
      validCode: "1",
      data: {
        day,
        content,
        contentID,
        everChoose: ticket != null,
        circleTopics: finalCicles,
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

//E-3 參加指定主題圈圈
router.post("/join-circle", async (req, res) => {
  try {
    const { userID, isSubscription } = req.user;
    const { circleTopicID } = req.body;

    if (!isSubscription) {
      return res.status(200).send({
        status: true,
        message: "主題小圈圈僅開放訂閱會員！",
        validCode: "1",
        data: {
          joinStatusCode: "-1",
        },
      });
    }

    //查詢用戶是否已經參加主題圈圈(是否擁有圈圈門票)
    const ticket = await CircleTicket.findOne({ ticketOwnerID: userID });

    const uuid = uuidv4(); // 生成 UUID v4
    const ticketID = uuid.replace(/\D/g, "").slice(0, 10);

    if (ticket == null) {
      //用戶尚未擁有圈圈門票
      await CircleTicket.create({
        ticketID,
        ticketOwnerID: userID,
        circleTopicID,
      });

      //加入指定預備圈圈
      const updateQuery = {
        $addToSet: { circleReadyUsers: userID },
      };

      if (circleTopicID !== "random") {
        updateQuery.$inc = { cumulativeCounts: 1 };
      }

      await ReadyCircle.updateOne({ circleTopicID }, updateQuery);

      return res.status(200).send({
        status: true,
        message: "成功加入指定主題圈圈",
        validCode: "1",
        data: {
          //首次加入圈圈
          joinStatusCode: "1",
          ticketID,
          circleTopicID,
        },
      });
    } else {
      return res.status(200).send({
        status: true,
        message: "你已經加入過其他圈圈勒",
        validCode: "1",
        data: {
          //有參加別的圈圈
          joinStatusCode: "2",
          ticketID: ticket.ticketID,
          circleTopicID: ticket.circleTopicID,
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

//E-4 退出主題圈圈票券
router.post("/quit-circle", async (req, res) => {
  try {
    const { userID } = req.user;

    //查詢用戶是否已經參加主題圈圈(是否擁有圈圈門票)
    const deletedTicket = await CircleTicket.findOneAndDelete({
      ticketOwnerID: userID,
    });

    if (deletedTicket == null) {
      return res.status(200).send({
        status: true,
        message: "你根本沒有票！還退！有病？！",
        validCode: "1",
      });
    }

    await ReadyCircle.updateOne(
      {
        circleTopicID: deletedTicket.circleTopicID,
      },
      {
        $pull: { circleReadyUsers: userID },
      }
    );

    return res.status(200).send({
      status: true,
      message: "成功退票",
      validCode: "1",
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

//E-5 查詢指定主題小圈圈資訊
router.post("/query-circle-info", async (req, res) => {
  try {
    const { userID } = req.user;
    //圈圈標題,聊天室色系,背景,用戶列表
    const { language, circleChannelID } = req.body;

    const circleInfo = await ActivityCircle.findOne({
      circleChannelID,
    });

    if (circleInfo == null) {
      return res.status(200).send({
        status: true,
        message: "查無指定的主題小圈圈",
        data: null,
      });
    }

    let data = {
      ...circleInfo._doc,
      circleTopicName: "",
      circleActivityUsers: [],
      agreeExtendCount: 0,
      rejectExtendCount: 0,
      voteExtendState: "",
    };

    const circleUsers = await User.find(
      { userID: { $in: circleInfo.circleUserIDS } },
      "userID userPhotos userName"
    );

    const activityUserInfos = circleUsers.map((user) => ({
      userID: user.userID,
      userName: user.userName,
      userPhoto: user.userPhotos?.[0] || "", // 取 userPhotos[0]，若沒有則為 ""
    }));

    data.circleActivityUsers = activityUserInfos;

    const matchedItem = CircleTopicNames.find(
      (item) => item.itemID === circleInfo.circleTopicID
    );

    data.circleTopicName =
      language == "en" ? matchedItem.des_EN : matchedItem.des_ZH;

    //計算贊成與不贊成延長
    const agreeUsers = circleInfo.circleVoteBox.circleAgreeUserIDS;
    const rejectUsers = circleInfo.circleVoteBox.circleRejectUserIDS;

    data.voteExtendState = agreeUsers.includes(userID)
      ? "1"
      : rejectUsers.includes(userID)
      ? "0"
      : "2";

    data.agreeExtendCount = agreeUsers.length;
    data.rejectExtendCount = rejectUsers.length;

    //刪掉不要的字段
    delete data._id;
    delete data.__v;
    delete data.circleUserIDS;
    delete data.circleVoteBox;

    return res.status(200).send({
      status: true,
      message: "成功顯示指定主題小圈圈資訊",
      validCode: "1",
      data,
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

//E-6 投票是否延長小圈圈群組
router.post("/vote-extend-circle", async (req, res) => {
  try {
    const { userID } = req.user;
    const { circleChannelID, voteActionType } = req.body;

    const targetCircle = await ActivityCircle.findOne({
      circleChannelID,
    });

    if (targetCircle == null) {
      return res.status(200).send({
        status: true,
        message: "查無指定的主題小圈圈",
        validCode: "1",
      });
    }

    const agreeUsers = targetCircle.circleVoteBox.circleAgreeUserIDS;
    const rejectUsers = targetCircle.circleVoteBox.circleRejectUserIDS;

    const currentVoteState = agreeUsers.includes(userID)
      ? "1"
      : rejectUsers.includes(userID)
      ? "0"
      : "2";

    //已經投過票了
    if (currentVoteState == "1" || currentVoteState == "0") {
      return res.status(200).send({
        status: true,
        message: "你已經投下" + (currentVoteState == "1" ? "贊成票" : "反對票"),
        validCode: "1",
      });
    }
    //目前尚未投票,
    if (currentVoteState == "2") {
      if (voteActionType == "1") {
        //投贊成票
        agreeUsers.push(userID);
      } else if (voteActionType == "0") {
        //投拒絕票
        rejectUsers.push(userID);
      }
    }

    //計算目前贊成票率
    const agreeRate = Math.round(
      (agreeUsers.length / targetCircle.circleUserIDS.length) * 100
    );

    await ActivityCircle.updateOne(
      {
        circleChannelID,
      },
      {
        "circleVoteBox.circleAgreeUserIDS": agreeUsers,
        "circleVoteBox.circleRejectUserIDS": rejectUsers,
        "circleVoteBox.agreeVoteRate": agreeRate,
      }
    );

    const data = {
      agreeExtendCount: agreeUsers.length,
      rejectExtendCount: rejectUsers.length,
      voteExtendState: voteActionType,
      //1:贊成 0: 不贊成 2:沒投過
    };

    return res.status(200).send({
      status: true,
      message: "已成功投下" + (voteActionType == "1" ? "贊成票" : "反對票"),
      validCode: "1",
      data,
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

//E-7 取消小圈圈群組投票
router.post("/cancel-vote-circle", async (req, res) => {
  try {
    const { userID } = req.user;
    const { circleChannelID } = req.body;

    const targetCircle = await ActivityCircle.findOne({
      circleChannelID,
    });

    if (targetCircle == null) {
      return res.status(200).send({
        status: true,
        message: "查無指定的主題小圈圈",
        validCode: "1",
      });
    }

    let agreeUsers = targetCircle.circleVoteBox.circleAgreeUserIDS;
    let rejectUsers = targetCircle.circleVoteBox.circleRejectUserIDS;

    const currentVoteState = agreeUsers.includes(userID)
      ? "1"
      : rejectUsers.includes(userID)
      ? "0"
      : "2";

    if (currentVoteState == "2") {
      return res.status(200).send({
        status: true,
        message: "來亂的？！你根本還沒有投票！",
        validCode: "1",
      });
    }

    if (currentVoteState == "1") {
      //目前是投贊成票 => 要撤銷
      agreeUsers = agreeUsers.filter((id) => id !== userID);
    }

    if (currentVoteState == "0") {
      //目前是投反對票 => 要撤銷
      rejectUsers = rejectUsers.filter((id) => id !== userID);
    }

    //計算目前贊成票率
    const agreeRate = Math.round(
      (agreeUsers.length / targetCircle.circleUserIDS.length) * 100
    );

    await ActivityCircle.updateOne(
      {
        circleChannelID,
      },
      {
        "circleVoteBox.circleAgreeUserIDS": agreeUsers,
        "circleVoteBox.circleRejectUserIDS": rejectUsers,
        "circleVoteBox.agreeVoteRate": agreeRate,
      }
    );

    return res.status(200).send({
      status: true,
      message: "已成功撤銷" + (currentVoteState == "1" ? "贊成票" : "反對票"),
      validCode: "1",
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

module.exports = router;
