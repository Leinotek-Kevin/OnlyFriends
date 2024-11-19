const router = require("express").Router();
const User = require("../models").user;
const EmotionLetter = require("../models").letter;
const passport = require("passport");
const dotenv = require("dotenv");
dotenv.config();
const { v4: uuidv4 } = require("uuid");
const dateUtil = require("../utils/date-util");

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
    let { updateDate, likeLetters } = req.user.emotionLetter;

    let today = dateUtil.getToday();
    let isNotToday = updateDate !== today;

    //if (page == 1) {
    if (isNotToday) {
      likeLetters = [];

      await User.updateOne(
        {
          userID: req.user.userID,
        },
        {
          "emotionLetter.likeLetters": likeLetters,
          "emotionLetter.updateDate": today,
        }
      );
    }
    //}

    // 從請求中獲取 page ,並設置默認值
    //const queryPage = parseInt(page) || 1;

    // 計算應該跳過的數據量 (用於分頁)
    //const skip = (queryPage - 1) * loadCount;

    let data = await EmotionLetter.find({})
      .sort({ createTime: -1 })
      //.skip(skip)
      .limit(loadCount)
      .populate("letterUser", ["userID", "userName", "userPhoto"]);

    let hasLetters = data != null && data.length > 0;

    if (hasLetters && !isNotToday && likeLetters.length > 0) {
      data = data.map((letter) => {
        letter.likeStatus = likeLetters.includes(letter.letterID);
        letter.likeCount = letter.likeCount < 0 ? 0 : letter.likeCount;
        return letter; // 確保返回每個 letter
      });
    }

    return res.status(200).send({
      status: true,
      message: hasLetters ? "成功獲取心情樹洞列表" : "目前沒有任何心情紙條喔！",
      data: hasLetters ? data : [],
    });
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: false,
      message: "Server Error!",
    });
  }
});

//D-2 發送心情樹洞信封
router.post("/send-letter", async (req, res) => {
  try {
    let { _id, userID } = req.user;
    let { content, pic } = req.body;

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
      });
    } else {
      const uuid = uuidv4(); // 生成 UUID v4
      // 移除非數字的字符，只保留數字，並取前 12 位
      letterID = uuid.replace(/\D/g, "").slice(0, 12);

      letterData.letterContent = content;
      letterData.letterID = letterID;

      await EmotionLetter.create(letterData);

      return res.status(200).send({
        status: true,
        message: "心情樹洞紙飛機發送成功！",
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).send({ status: false, message: "Server Error", e });
  }
});

//D-3 按/取消心情樹洞信封讚
router.post("/like-letter", async (req, res) => {
  try {
    let { action, letterID } = req.body; //0:取消 1:案讚

    let { likeLetters, updateDate } = req.user.emotionLetter;

    //如果用戶上次操作讚的日期不是今天,那將待更新的 letterArray 改為 [] 開始
    if (updateDate !== dateUtil.getToday()) {
      likeLetters = [];
    }

    //這則信封的案讚總量
    const letterData = await EmotionLetter.findOne({
      letterID,
    });

    let counts = letterData.likeCount;

    if (action === "0") {
      // 取消讚
      let letterSet = new Set(likeLetters);
      // 刪除指定元素
      letterSet.delete(letterID);
      // 將 Set 轉換回數組
      likeLetters = Array.from(letterSet);
      counts--;
    } else if (action === "1") {
      //案讚
      likeLetters.push(letterID);
      counts++;
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
      User.updateOne(
        {
          userID: req.user.userID,
        },
        {
          "emotionLetter.likeLetters": likeLetters,
          "emotionLetter.updateDate": dateUtil.getToday(),
        }
      ),
    ]);

    return res.status(200).send({
      status: true,
      message: "信封案讚狀態已更新",
    });
  } catch (e) {
    console.log(e);
    return res.status(500).send({ status: false, message: "Server Error", e });
  }
});

module.exports = router;
