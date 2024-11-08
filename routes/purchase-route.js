const router = require("express").Router();
const User = require("../models").user;
const Purchase = require("../models").purchase;
const passport = require("passport");

//先驗證 user 是不是存在，並獲取 user info
router.use((req, res, next) => {
  console.log("正在接收一個跟 purchase 有關的請求");
  next();
});

//申報用戶購買紀錄
router.post("/report", (req, res) => {
  passport.authenticate("jwt", { session: false }, async (err, user, info) => {
    if (err) {
      return res.status(500).json({ status: false, message: "Server Error" });
    }

    if (!user) {
      // 這裡返回自定義訊息
      return res
        .status(200)
        .json({ status: true, message: "登出失敗！查無此用戶" });
    }

    try {
      let { purchaseType, purchaseToken, purchaseReceipt, osType } = req.body;
      let { userID, userEmail } = user;

      const record = await Purchase.findOne({
        userID,
        purchaseType,
        purchaseToken,
      });

      if (record != null) {
        return res.status(200).send({
          status: true,
          message: "購買紀錄已存在！",
          data: record,
        });
      }

      // 準備要更新的資料
      let createData = {
        userID,
        osType,
        purchaseType,
        purchaseToken,
      };

      if (purchaseReceipt != null) {
        createData.purchaseReceipt = purchaseReceipt;
      }

      const data = await Purchase.create(createData);

      if (data) {
        await User.updateOne({ userID, userEmail }, { isSubscription: true });
      }

      return res.status(200).send({
        status: true,
        message: "購買紀錄已儲存",
        data,
      });
    } catch (e) {
      return res.status(500).send({
        status: false,
        message: "Server Error",
      });
    }
  })(req, res);
});

//獲取用戶的購買紀錄
router.get("/record", async (req, res) => {
  let { userID, purchaseType } = req.body;

  try {
    const data = await Purchase.find({ userID, purchaseType });

    if (data && data.length > 0) {
      return res.status(200).send({
        status: true,
        message: "成功獲得用戶購買紀錄",
        data,
      });
    } else {
      return res.status(200).send({
        status: true,
        message: "該用戶無購買紀錄",
        data: [],
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

router.delete("/record", async (req, res) => {
  let { userID, purchaseToken } = req.body;

  try {
    await Purchase.findOneAndDelete({ userID, purchaseToken });

    return res.status(200).send({
      status: true,
      message: "成功刪除用戶購買紀錄",
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

module.exports = router;
