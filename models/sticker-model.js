const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作貼圖系列 Schema
const stickerSchema = new Schema({
  //貼圖優先序 ()
  priority: {
    type: Number,
  },

  //貼圖類別 0:免費 1:付費
  stickerPlan: {
    type: String,
    enum: ["0", "1"],
  },

  //貼圖系列 ID
  stickerID: {
    type: Number,
  },

  //貼圖是否可用
  stickerAvailable: {
    type: Boolean,
    default: true,
  },

  //貼圖系列集
  stcikerItems: [
    {
      stickerItemID: {
        type: String,
      },
    },

    {
      stickerItemImg: {
        type: String,
      },
    },
  ],
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

module.exports = mongoose.model("Stciker", stickerSchema);
