const router = require("express").Router();
const User = require("../models").user;
const Purchase = require("../models").purchase;
const passport = require("passport");
const googleUtil = require("../utils/google-util");

//先驗證 user 是不是存在，並獲取 user info
router.use((req, res, next) => {
  console.log("正在接收一個跟 purchase 有關的請求");
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

//C-1 驗證購買收據憑證
router.post("/google-verify", async (req, res) => {
  try {
    //productType : 產品類型 0:訂閱 1:單購
    let { originalPurchaseJson, productType } = req.body;

    //Android Receipt 驗證
    const { packageName, productId, purchaseToken } =
      JSON.parse(originalPurchaseJson);

    if (productType == "0") {
      //驗證訂閱
      const data = await googleUtil.validSubscriptionOrder(
        packageName,
        productId,
        purchaseToken
      );

      console.log(data);

      if (data) {
        return res.status(200).send({
          status: true,
          message: "驗證成功！允許使用產品權限",
          data,
        });
      } else {
        return res.status(200).send({
          status: true,
          message: "驗證失敗！查無訂單明細",
        });
      }
    }
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});

//C-1 申報用戶購買紀錄
router.post("/report", (req, res) => {
  passport.authenticate("jwt", { session: false }, async (err, user, info) => {
    if (err) {
      return res.status(500).json({ status: false, message: "Server Error" });
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

    try {
      let { userID, userEmail } = user;
      let { action, purchaseType, purchaseToken, purchaseReceipt, osType } =
        req.body;

      if (action === "0") {
        //刪除購買紀錄
        const result = await Purchase.deleteOne({
          userID,
          purchaseType,
          osType,
        });

        if (result.deletedCount > 0) {
          if (purchaseType === "0") {
            //如果是訂閱，就取消該用戶訂閱
            await User.updateOne(
              { userID, userEmail },
              { isSubscription: false }
            );
          }

          return res.status(200).send({
            status: true,
            message: "購買紀錄已刪除",
            validCode: "1",
          });
        } else {
          return res.status(200).send({
            status: true,
            message: "查無任何購買紀錄",
            validCode: "1",
          });
        }
      } else {
        //新增購買紀錄
        const record = await Purchase.findOne({
          userID,
          purchaseType,
          purchaseToken,
        });

        if (record != null) {
          return res.status(200).send({
            status: true,
            message: "購買紀錄已存在！",
            validCode: "1",
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
          validCode: "1",
        });
      }
    } catch (e) {
      return res.status(500).send({
        status: false,
        message: "Server Error",
        validCode: "-1",
      });
    }
  })(req, res);
});

//C-2 獲取用戶的購買紀錄
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

//C-2 刪除指定的購買紀錄
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
