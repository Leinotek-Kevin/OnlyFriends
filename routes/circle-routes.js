const router = require("express").Router();
const passport = require("passport");
const dotenv = require("dotenv");
dotenv.config();

const CircleTicket = require("../models").circleTicket;
const ReadyCircle = require("../models").readyCircle;
const User = require("../models").user;
const { v4: uuidv4 } = require("uuid");
const { user } = require("../models");
const uuid = uuidv4(); // 生成 UUID v4

const { CircleTopicIDS } = require("../config/enum");

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

//E-3 參加指定主題圈圈
router.post("/join-circle", async (req, res) => {
  try {
    const { userID, isSubscription } = req.user;
    const { circleTopicID } = req.body;

    if (isSubscription) {
      return res.status(200).send({
        status: true,
        message: "主題小圈圈僅開放訂閱會員！",
        data: {
          joinStatusCode: "-1",
        },
      });
    }

    //查詢用戶是否已經參加主題圈圈(是否擁有圈圈門票)
    const ticket = await CircleTicket.findOne({ ticketOwnerID: userID });
    const ticketID = uuid.replace(/\D/g, "").slice(0, 10);

    if (ticket == null) {
      //用戶尚未擁有圈圈門票
      await CircleTicket.create({
        ticketID,
        ticketOwnerID: userID,
        circleTopicID,
      });

      //加入指定預備圈圈
      await ReadyCircle.updateOne(
        {
          circleTopicID,
        },
        {
          $addToSet: { circleReadyUsers: userID }, // 加入 userID，避免重複
        }
      );

      return res.status(200).send({
        status: true,
        message: "成功加入指定主題圈圈",
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
        data: {
          //有參加別的圈圈
          joinStatusCode: "2",
          ticketID: ticket.ticketID,
          circleTopicID: ticket.circleTopicID,
        },
      });
    }
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
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

    const mapItem = (item) => ({
      circleTopicID: item.itemID,
      description: language == "en" ? item.des_EN : item.des_ZH,
      isChoose: ticket ? item.itemID == ticket.circleTopicID : false,
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
        circleTopics: CircleTopicIDS.map(mapItem),
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

//E-3 退出主題圈圈票券
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
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
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

    //詢問結果
    const result = {
      day,
      isNewDuration,
      content: "尚未開放報名",
      contentID: "0",
      canJoin: false,
      everChoose: false,
      chooseCircleTopicID: "",
    };

    if (ticket) {
      result.everChoose = true;
      result.chooseCircleTopicID = ticket.circleTopicID;
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

//建立主題圈圈
router.post("/create-circle", async (req, res) => {
  try {
    const { circleTopicID } = req.body;

    await ReadyCircle.findOneAndUpdate(
      {
        circleTopicID,
      },
      {
        circleTopicID,
        circleReadyUsers: [],
      },
      {
        upsert: true,
      }
    );

    return res.status(200).send({
      status: true,
      message: "成功建立指定圈圈",
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

//將用戶隨機分配到預備圈圈
router.post("/random-circle-user", async (req, res) => {
  try {
    const circleTopicIDS = (
      await ReadyCircle.find({}, { circleTopicID: 1 })
    ).map((circle) => circle.circleTopicID);

    const userIDS = (await User.find({}, { _id: 0, userID: 1 })).map(
      (user) => user.userID
    );

    const shuffled = [...userIDS].sort(() => Math.random() - 0.5);
    const circleGroups = {};

    // 先初始化，每個群組先放一個 userID，避免為空
    circleTopicIDS.forEach((topic, i) => {
      circleGroups[topic] = [shuffled.pop()];
    });

    // 把剩下的人隨機塞到任一群組
    shuffled.forEach((userID) => {
      const randomTopic =
        circleTopicIDS[Math.floor(Math.random() * circleTopicIDS.length)];
      circleGroups[randomTopic].push(userID);
    });

    await Promise.all(
      circleTopicIDS.map((circleTopicID) =>
        ReadyCircle.updateOne(
          { circleTopicID },
          { circleReadyUsers: circleGroups[circleTopicID] }
        )
      )
    );

    return res.status(200).send({
      status: true,
      message: "成功完成分配",
      data: {
        circleGroups,
      },
    });
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

module.exports = router;
