const router = require("express").Router();
const User = require("../models").user;
const EmotionLetter = require("../models").letter;
const UserRelation = require("../models").userRelation;
const passport = require("passport");
const dotenv = require("dotenv");
dotenv.config();
const { v4: uuidv4 } = require("uuid");
const dateUtil = require("../utils/date-util");
const storeageUtil = require("../utils/cloudStorage-util");

//先驗證 user 是不是存在，並獲取 user info
router.use((req, res, next) => {
  console.log("正在接收一個跟 user 有關的請求");
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ status: false, message: "伺服器錯誤" });
    }

    if (!user) {
      // 這裡返回自定義訊息
      return res
        .status(200)
        .send({ status: true, message: "JWT 驗證失敗！查無此用戶" });
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

//D-1 展示所有心情樹洞信封
router.post("/show-all", async (req, res) => {
  const loadCount = 30;

  try {
    //let { page } = req.body;
    // 從請求中獲取 page ,並設置默認值
    //const queryPage = parseInt(page) || 1;
    // 計算應該跳過的數據量 (用於分頁)
    //const skip = (queryPage - 1) * loadCount;

    const todayNightTimeStamp = dateUtil.getTodayNight();

    let { userID, lastSendLetterTime } = req.user;
    let isTodayEverSend = dateUtil.isToday(lastSendLetterTime);

    let userLikeLetters = [];
    let relation = await UserRelation.findOne({ userID });

    if (relation) {
      let { updateDate, likeLetters } = relation.letterActive;

      let today = dateUtil.getToday();
      let isNotToday = updateDate !== today;

      if (isNotToday) {
        await UserRelation.updateOne(
          {
            userID,
          },
          {
            "letterActive.likeLetters": [],
            "letterActive.updateDate": today,
          }
        );
      } else {
        userLikeLetters = likeLetters;
      }
    }

    let data = await EmotionLetter.find({
      createTime: { $lt: todayNightTimeStamp },
    })
      .sort({ createTime: -1 })
      //.skip(skip)
      .limit(loadCount)
      .populate("letterUser", ["userID", "userName", "userPhotos"]);

    let hasLetters = data != null && data.length > 0;

    if (hasLetters && userLikeLetters.length > 0) {
      data = data.map((letter) => {
        letter.likeStatus = userLikeLetters.includes(letter.letterID);
        letter.likeCount = letter.likeCount < 0 ? 0 : letter.likeCount;
        return letter; // 確保返回每個 letter
      });
    }

    return res.status(200).send({
      status: true,
      message: hasLetters ? "成功獲取心情樹洞列表" : "目前沒有任何心情紙條喔！",
      validCode: "1",
      data: {
        isTodayEverSend,
        letters: hasLetters ? data : [],
      },
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      validCode: "-1",
    });
  }
});

//D-2 發送心情樹洞信封
router.post("/send-letter", async (req, res) => {
  try {
    let { _id, userID, lastSendLetterTime } = req.user;
    let { content, pic } = req.body;

    //如果今天已經發過就不能再發
    const everSendToday = dateUtil.isToday(lastSendLetterTime);

    if (everSendToday) {
      return res.status(200).send({
        status: true,
        message: "發送失敗！你今天已經發過信封嚕！",
        validCode: "1",
      });
    }

    let letterData = {
      letterUser: _id,
      letterUserID: userID,
      createTime: Date.now(),
    };

    if (pic != null) {
      letterData.letterPic = pic;
    }

    if (content == null || content == "" || content.length > 50) {
      return res.status(404).send({
        status: false,
        message: "信封內容錯誤！",
        validCode: "1",
      });
    } else {
      const uuid = uuidv4(); // 生成 UUID v4
      // 移除非數字的字符，只保留數字，並取前 12 位
      let letterID = uuid.replace(/\D/g, "").slice(0, 12);

      letterData.letterContent = content;
      letterData.letterID = letterID;

      //隨機抽樣郵戳樣式
      let letterMark = "";
      const marks = await storeageUtil.getImagesByFolder("system/letter-mark");

      if (marks && marks.length > 0) {
        const randomIndex = Math.floor(Math.random() * marks.length);
        letterMark = marks[randomIndex];
      }

      letterData.letterMark = letterMark;

      await Promise.all([
        EmotionLetter.create(letterData),
        User.updateOne(
          {
            userID,
          },
          { lastSendLetterTime: Date.now() }
        ),
      ]);

      return res.status(200).send({
        status: true,
        message: "心情樹洞紙飛機發送成功！",
        validCode: "1",
      });
    }
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .send({ status: false, message: "Server Error", e, validCode: "-1" });
  }
});

//D-3 按/取消心情樹洞信封讚
router.post("/like-letter", async (req, res) => {
  try {
    let { userID } = req.user;
    let { action, letterID } = req.body; //0:取消 1:案讚

    const letterData = await EmotionLetter.findOne({
      letterID,
    });

    if (letterData == null) {
      return res.status(200).send({
        status: true,
        message: "該信封不存在！",
        validCode: "1",
      });
    }

    //這則信封的案讚總量
    let counts = letterData.likeCount;

    //該用戶今天的點讚的信封
    let likeLetters = [];
    const relation = await UserRelation.findOne({ userID });

    if (relation) {
      likeLetters = relation.letterActive.likeLetters;
    }

    if (action === "0") {
      if (likeLetters.indexOf(letterID) != -1) {
        // 取消讚
        let letterSet = new Set(likeLetters);
        // 刪除指定元素
        letterSet.delete(letterID);
        // 將 Set 轉換回數組
        likeLetters = Array.from(letterSet);
        counts--;
      }
    } else if (action === "1") {
      if (likeLetters.indexOf(letterID) == -1) {
        //案讚
        likeLetters.push(letterID);
        counts++;
      }
    }

    //防止變成 0
    if (counts < 0) {
      counts = 0;
    }

    //並行處理 user 和 letter 操作
    await Promise.all([
      // 更新這則信封的按讚總量
      EmotionLetter.updateOne(
        {
          letterID,
        },
        {
          likeCount: counts,
        }
      ),
      // 更新用戶今天按讚的信封 ID
      UserRelation.findOneAndUpdate(
        {
          userID,
        },
        {
          "letterActive.likeLetters": likeLetters,
          "letterActive.updateDate": dateUtil.getToday(),
        },
        {
          upsert: true,
        }
      ),
    ]);

    return res.status(200).send({
      status: true,
      message: "信封案讚狀態已更新",
      validCode: "1",
    });
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .send({ status: false, message: "Server Error", e, validCode: "-1" });
  }
});

module.exports = router;
