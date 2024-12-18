const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作用戶關係 Schema
const userRelationSchema = new Schema({
  //用戶 ID
  userID: {
    type: String,
    required: true,
    unique: true,
  },

  //使用者封鎖的用戶
  unlikeUsers: {
    type: Array,
    default: [],
  },

  //使用者喜歡的信封
  letterActive: {
    likeLetters: {
      type: Array,
      default: [],
    },

    updateDate: {
      type: String,
      default: "",
    },
  },

  //與對象的互動
  objectActive: {
    likeObjects: [
      {
        objectID: String,
        likeLevel: {
          type: Number,
          enum: [1, 2, 3],
          default: 1,
        },
      },
    ],

    updateDate: {
      type: String,
      default: "",
    },
  },
});

//隱藏 _id,__v
userRelationSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("UserRelation", userRelationSchema);
