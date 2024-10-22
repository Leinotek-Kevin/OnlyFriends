const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作會員 Schema
const userSchema = new Schema({
  userID: {
    type: String,
    required: true,
  },

  userName: {
    type: String,
  },

  userEmail: {
    type: String,
    required: true,
    unique: true,
  },

  userPhoto: {
    type: String,
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
