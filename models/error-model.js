const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作系統配置 Schema
const errorSchema = new Schema({
  //錯誤需求參數紀錄
  errorRequest: {
    type: String,
    default: "",
  },
  //錯誤需求參數訊息
  errorMessage: {
    type: String,
    default: "",
  },
});

//隱藏 _id,__v
errorSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Error", errorSchema);
