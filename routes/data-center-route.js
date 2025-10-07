const router = require("express").Router();
const User = require("../models").user;
const Transcation = require("../models").transcation;
const CircleTicket = require("../models").circleTicket;
const passport = require("passport");
const dotenv = require("dotenv");
dotenv.config();
const dateUtil = require("../utils/date-util");

router.use((req, res, next) => {
  console.log("正在接收一個跟 data-center 有關的請求");
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

//Z-1 取得基本數據(註冊、訂閱、登入、性別、年齡、地區)
router.post("/general-data", async (req, res) => {
  try {
    const { userID } = req.user;

    //推算註冊人數 registerTime
    //今天註冊人數
    const todayNight = dateUtil.getTodayNight();

    const todayRegisters = await User.countDocuments({
      registerTime: { $gte: todayNight },
      userValidCode: "1",
    });

    //昨日註冊人數
    const lastNight = dateUtil.getYesterdayNight();

    const lastRegisters = await User.countDocuments({
      registerTime: { $gte: lastNight, $lt: todayNight },
      userValidCode: "1",
    });

    //總註冊人數
    const allRegisters = await User.countDocuments({
      userValidCode: "1",
    });

    //今天登入人數
    const todayLogins = await User.countDocuments({
      lastLoginTime: { $gte: todayNight },
      userValidCode: "1",
    });

    //昨日登入人數
    const lastLogins = await User.countDocuments({
      lastLoginTime: { $gte: lastNight, $lt: todayNight },
      userValidCode: "1",
    });

    //推算男女比例
    const genderResult = await User.aggregate([
      { $match: { userValidCode: "1" } }, // 注意：這裡 userValidCode 如果是 Number 就不要用 "1"
      {
        $group: {
          _id: "$userGender",
          count: { $sum: 1 },
        },
      },
    ]);

    const genderCounts = { female: 0, male: 0, special: 0 };

    genderResult.forEach((r) => {
      if (r._id === "0" || r._id === 0) genderCounts.female = r.count;
      if (r._id === "1" || r._id === 1) genderCounts.male = r.count;
      if (r._id === "2" || r._id === 2) genderCounts.special = r.count;
    });

    //今日訂閱訂單
    const todayOrders = await Transcation.countDocuments({
      startDate: { $gte: todayNight },
      isAllow: true,
    });

    //昨日訂閱訂單
    const yesterdayOrders = await Transcation.countDocuments({
      startDate: { $gte: lastNight, $lt: todayNight },
      isAllow: true,
    });

    //總訂閱訂單
    const allOrders = await Transcation.countDocuments({
      isAllow: true,
    });

    //小圈圈報名人數
    const circleTickets = await CircleTicket.countDocuments({});

    //Android 存活人數
    const aliveAndroids = await User.countDocuments({ osType: "0" });

    //iOS 存活人數
    const aliveiOSs = await User.countDocuments({ osType: "1" });

    const data = {
      todayRegisters,
      lastRegisters,
      allRegisters,
      todayLogins,
      lastLogins,
      todayOrders,
      yesterdayOrders,
      allOrders,
      genderCounts,
      circleTickets,
      os: {
        aliveAndroids,
        aliveiOSs,
      },
    };

    return res.status(200).send({
      status: true,
      message: "成功獲取基本數據分析資料",
      validCode: "1",
      data,
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

module.exports = router;
