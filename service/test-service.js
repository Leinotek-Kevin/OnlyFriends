const cloudMsgService = require("../utils/cloudmsg-util");
const MatchNewest = require("../models").matchNewest;
const User = require("../models").user;
const dateUtil = require("../utils/date-util");
const mongoose = require("mongoose");

const startFetching = async () => {
  //台灣時間
  const now = new Date();

  if (now.getHours() == 19) {
  } else {
    console.log("還沒到 12:00 喔！");
  }
};

module.exports = startFetching;
