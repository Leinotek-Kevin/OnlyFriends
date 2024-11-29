const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作會員 Schema
const userSchema = new Schema({
  //用戶 mail
  userEmail: {
    type: String,
    required: true,
    unique: true,
    match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
  },

  //用戶 ID
  userID: {
    type: String,
    required: true,
    unique: true,
  },

  //用戶暱稱
  userName: {
    type: String,
    length: 16,
    required: true,
  },

  //用戶性別
  userGender: {
    type: String,
    enum: ["0", "1", "2"], //0：女生 1：男生 2:特殊
    required: true,
  },

  //用戶性別 1993/01/28
  userBirthday: {
    type: String,
    required: true,
  },

  //用戶年齡
  userAge: {
    type: Number,
  },

  //用戶星座
  // 1: 白羊座 2: 金牛座 3:雙子座 4:巨蟹座 5:獅子座 6:處女座
  // 7: 天秤座 8: 天蠍座 9:射手座 10:摩羯座 11:水瓶座 12:雙魚座
  userZodiac: {
    type: String,
    default: "",
  },

  //用戶 MBTI
  userMBTI: {
    type: String,
    default: "",
  },

  //用戶大頭貼集
  userPhotos: {
    type: Array,
    default: [],
  },

  //用戶所在地區
  userRegion: {
    type: String,
    required: true,
  },

  //用戶裝置 id
  deviceToken: {
    type: String,
    default: "",
  },

  //用戶提問
  userQuestion: {
    type: String,
    default: "嗨！很高興認識你！你是哪裡人呢？",
  },

  //用戶屬性
  userAttribute: {
    //感情狀態
    emotion: {
      type: String,
      default: "",
    },
    //興趣愛好
    interested: {
      type: String,
      default: "",
    },
    //個人特質
    traits: {
      type: String,
      default: "",
    },
    //交友動機
    friendStatus: {
      type: String,
      default: "",
    },
    //情場經歷
    loveExperience: {
      type: String,
      default: "",
    },
  },

  //用戶篩選對象條件
  objectCondition: {
    //希望性別
    objectGender: {
      type: String,
      enum: ["0", "1", "2", "-1"],
    },

    //希望年齡
    objectAge: {
      maxAge: {
        type: Number,
        max: 50,
        default: 50,
      },
      minAge: {
        type: Number,
        min: 18,
        default: 18,
      },
    },
    //希望地區
    objectRegion: {
      type: String,
      default: "B",
    },
  },

  //用戶系統設備
  osType: {
    type: String,
    enum: ["0", "1"],
  },

  //是否是機器人
  identity: {
    type: Number,
    required: true,
    enum: [0, 1, 2], //0:假人 1:官方指定 2:真人
  },

  //該用戶是否有訂閱
  isSubscription: {
    type: Boolean,
    default: false,
  },

  //該用戶推播關關狀態
  notificationStatus: {
    type: Boolean,
    default: false,
  },

  //該用戶登入狀態
  isLogin: {
    type: Boolean,
    default: false,
  },

  //用戶註冊時間
  registerTime: {
    type: Number,
  },

  //用戶最近一次發送信封的時間
  lastSendLetterTime: {
    type: Number,
  },

  //最近一次登入時間
  lastLoginTime: {
    type: Number,
    required: true,
  },

  //用戶帳號狀態代碼
  userValidCode: {
    type: String,
    default: "1",
  },
});

userSchema.index({ userID: 1, userMail: 1 }, { unique: true });
//1：升序 , -1:降序
userSchema.index({ lastLoginTime: -1, identity: -1, isSubscription: -1 });

//隱藏 _id,__v
userSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
