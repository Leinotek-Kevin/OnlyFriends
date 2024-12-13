const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作背景主題 Schema
const topicSchema = new Schema({
  //背景主題優先序
  priority: {
    type: Number,
  },

  //背景主題ID
  topicID: {
    type: String,
  },

  //背景主題方案 F:免費 P:付費
  topicPlan: {
    type: String,
    enum: ["P", "F"],
  },
});

topicSchema.index({ priority: -1 });

//隱藏 _id,__v
topicSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Topic", topicSchema);
