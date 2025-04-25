const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作圈圈票券 Schema
const circleTicketSchema = new Schema({
  //票券 ID
  ticketID: {
    type: String,
    default: "",
  },

  //票券擁有者
  ticketOwnerID: {
    type: String,
    default: "",
  },

  //參加的圈圈類型ID
  circleTopicID: {
    type: String,
    default: "",
  },

  //建立生效時間
  createTime: {
    type: Number,
    default: Date.now(),
  },

  //票券截止日期
  expiredTime: {
    type: Date,
  },
});

//隱藏 _id,__v
circleTicketSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("CircleTicket", circleTicketSchema);
