const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作檢舉配置 Schema
const reportSchema = new Schema({
  //檢舉案件ID
  reportID: {
    type: String,
    required: true,
  },
  //檢舉人ID
  reportUserID: {
    type: String,
  },
  //檢舉對象ID
  reportObjectID: {
    type: String,
  },
  //檢舉項目ID
  reasonItemID: {
    type: String,
  },
  //檢舉項目描述
  reasonItemDes: {
    type: String,
  },
  //檢舉內容
  content: {
    type: String,
    default: "",
  },
  //檢舉照片
  photos: {
    type: Array,
    default: [],
  },
  //檢舉日期
  reportDate: {
    type: Date,
    default: Date.now,
  },
});

reportSchema.index({ reportDate: 1 });

//隱藏 _id,__v
reportSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Report", reportSchema);
