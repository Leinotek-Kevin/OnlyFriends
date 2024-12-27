const router = require("express").Router();
const User = require("../models").user;
const Purchase = require("../models").purchase;
const Transcation = require("../models").transcation;
const passport = require("passport");
const googleUtil = require("../utils/google-util");
const iOSUtil = require("../utils/iOS-util");
const dateUtil = require("../utils/date-util");

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

//C-1 App Google 驗證購買收據憑證
router.post("/google-verify", async (req, res) => {
  try {
    //productType : 產品類型 0:訂閱 1:單購
    let { originalPurchaseJson, productType } = req.body;
    let { userID } = req.user;

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

      if (data) {
        //分析驗證訂閱的資料
        const {
          orderId, // 訂單ＩＤ GPA.3357-5076-3532-61828..5 標示該筆訂單續訂5次
          startTimeMillis, //這是訂閱生效的時間
          expiryTimeMillis, // 這是訂閱結束的時間
          autoRenewing, //是否自動訂閱
          priceCurrencyCode, //幣別
          priceAmountMicros, //原子價格
          paymentState, //付款狀態
          cancelReason, //訂閱取消的原因（如果訂閱被取消）。常見的取消原因有：0: 用戶取消。 1: 付款問題（例如信用卡過期）
          purchaseType, //購買的類型
          acknowledgementState, //訂閱是否已被確認 0: 訂閱未被確認。 1: 訂閱已被確認
        } = data;

        if (acknowledgementState == 0) {
          //確定訂單
          await googleUtil.acknowledgeSubscription(
            packageName,
            productId,
            purchaseToken
          );
        }

        //真正的訂單id
        const splitOrderID = orderId.split("..");
        let realID = splitOrderID[0];
        let renewCount = 0;

        if (splitOrderID.length > 1) {
          // .. 後面是指續訂次數
          renewCount = Number(splitOrderID[1]);
        }

        //價格
        const price = Number(priceAmountMicros) / 1000000;

        //訂閱已過期 || 付款處理中 || 待處理的延遲升級/降級 => 不允許訂閱
        let isAllow = true;

        if (
          paymentState === 0 || // 付款處理中
          paymentState === 3 || // 待處理的延遲升級/降級
          !expiryTimeMillis || // 檢查 expiryTimeMillis 是否存在
          expiryTimeMillis < Date.now() // 檢查訂閱是否過期
        ) {
          isAllow = false;
        }

        //用戶訂閱狀態更新
        await User.updateOne({ userID }, { $set: { isSubscription: isAllow } });

        //購買紀錄
        const result = await Purchase.findOneAndUpdate(
          { userID, orderID: realID },
          {
            userID,
            platform: "Android",
            productID: productId,
            productType: "subscription",
            orderID: realID,
            startDate: startTimeMillis,
            expiryDate: expiryTimeMillis,
            price,
            currency: priceCurrencyCode,
            autoRenewing,
            renewCount,
            purchaseType,
            paymentState,
            cancelReason,
            acknowledgementState, //訂閱是否已被確認 0: 訂閱未被確認。 1: 訂閱已被確認,
            purchaseMemo: "",
            isAllow,
          },
          {
            upsert: true,
            new: true,
          }
        );

        return res.status(200).send({
          status: true,
          message: isAllow
            ? "驗證成功！允許使用產品訂閱權限"
            : "驗證成功！但不允許使用產品訂閱權限",
          validCode: 1,
          data: result,
        });
      } else {
        return res.status(200).send({
          status: true,
          message: "驗證失敗！查無訂單明細",
          validCode: 1,
        });
      }
    } else if (productType == "1") {
      return res.status(200).send({
        status: true,
        message: "目前沒有開放單購商品！",
        validCode: -1,
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

//C-2 App iOS 驗證購買收據憑證
router.post("/iOS-verify", async (req, res) => {
  try {
    let { userID } = req.user;
    let { transactionID, productType } = req.body;

    if (productType == "0") {
      const transaction = await iOSUtil.getTranscationInfo(transactionID);

      if (transaction) {
        //檢查訂單是否有效
        const currentTime = Date.now(); // 獲取當前時間 (Unix timestamp)
        const expiresDate = transaction.expiresDate; // 從訂單中獲取 expiresDate

        let isAllow =
          expiresDate > currentTime &&
          transaction.inAppOwnershipType == "PURCHASED";

        const result = await Transcation.findOneAndUpdate(
          { originalTransactionId, userID },
          {
            $set: {
              userID,
              platform: "iOS",
              transactionId: transaction.transactionId,
              originalTransactionId: transaction.originalTransactionId,
              productID: transaction.productId,
              productType,
              expiresDate: transaction.expiresDate,
              price: transaction.price / 1000,
              currency: transaction.currency,
              transcationMemo: transaction.type,
              purchaseDate: transaction.purchaseDate,
              isAllow,
            },
          },
          {
            upsert: true,
            new: true,
          }
        );

        //更改用戶訂閱狀態
        await User.updateOne(
          { userID },
          {
            $set: {
              isAllow,
            },
          }
        );

        return res.status(200).send({
          status: true,
          message: "驗證成功!交易紀錄已更新！",
          data: result,
        });
      } else {
        return res.status(200).send({
          status: true,
          message: "驗證失敗！查無此交易",
          e,
        });
      }
    } else {
      return res.status(200).send({
        status: true,
        message: "目前無開放單購商品",
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

//C-3 查詢用戶購買紀錄
router.post("/query-history", async (req, res) => {
  try {
    let { userID } = req.user;
    let { productType } = req.body;

    let data = [];

    if (productType) {
      data = await Purchase.find({
        userID,
        productType: productType == "0" ? "subscription" : "in-app",
      }).sort({ createDate: -1 });
    } else {
      data = await Purchase.find({
        userID,
      }).sort({ createDate: -1 });
    }

    return res.status(200).send({
      status: true,
      message: "獲取用戶購買紀錄",
      data,
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Serror Error!",
      e,
    });
  }
});

//取得驗證購買紀錄
router.post("/verify-receipt", async (req, res) => {
  try {
    let { packageName, productId, purchaseToken, productType } = req.body;

    const data = await googleUtil.validSubscriptionOrder(
      packageName,
      productId,
      purchaseToken
    );

    return res.status(200).send({
      status: true,
      message: "成功驗證訂單",
      data,
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Serror Error!",
      e,
    });
  }
});

module.exports = router;
