const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作會員 Schema
const userSchema = new Schema({
  userID: {
    type: String,
    required: true,
  },

  deviceToken: {
    type: String,
  },

  userName: {
    type: String,
    length: 10,
    required: true,
  },

  userGender: {
    type: String,
    enum: ["0", "1", "2"], //0：女生 1：男生 2:特殊
    required: true,
  },

  userAge: {
    type: String,
    min: 18,
    max: 120,
    required: true,
  },

  userEmail: {
    type: String,
    required: true,
    unique: true,
    match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
  },

  userPhoto: {
    type: String,
    required: true,
  },

  isLogin: {
    type: Boolean,
  },
});

userSchema.index({ userID: 1, userMail: 1 }, { unique: true });

//隱藏 _id,__v
userSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
