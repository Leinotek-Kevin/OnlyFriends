const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作系統配置 Schema
const configSchema = new Schema({
  //聊天室預設背景
  chatCover: {
    type: String,
  },
});

//隱藏 _id,__v
configSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Config", configSchema);
