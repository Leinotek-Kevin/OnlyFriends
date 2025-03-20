const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作貼圖系列 Schema
const stickerSchema = new Schema({
  //貼圖系列集優先序
  priority: {
    type: Number,
  },

  //貼圖系列集方案 F:免費 P:付費 R:真人驗證
  stickersPlan: {
    type: String,
    enum: ["P", "F", "R"],
  },

  //貼圖系列集ID名稱
  stickersID: {
    type: String,
  },

  //貼圖系列集 Tag 圖標
  stickersTag: {
    type: String,
  },

  //貼圖系列集是否可用
  stickersAvailable: {
    type: Boolean,
    default: true,
  },

  //貼圖系列集項目
  stickersItems: {
    type: Array,
    default: [],
  },
});

stickerSchema.index({ priority: -1 });

//隱藏 _id,__v
stickerSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Sticker", stickerSchema);
