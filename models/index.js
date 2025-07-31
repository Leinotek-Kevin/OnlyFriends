module.exports = {
  user: require("./user-model"),
  userRelation: require("./user-relation"),
  letter: require("./emotion-letter-model"),
  matchHistory: require("./match-history-model"),
  matchNewest: require("./match-newest-model"),
  transcation: require("./transcation-model"),
  sticker: require("./sticker-model"),
  topic: require("./topic-model"),
  report: require("./report-model"),
  config: require("./config-model"),
  error: require("./error-model"),
  readyCircle: require("./ready-circle-model"),
  circleTicket: require("./circle-ticket-model"),
  activityCircle: require("./activity-circle-model"),
  promotionCode: require("./promotion-code-model"),
  promotionStub: require("./promotion-stub-model"),

  //活動促銷活動
  promotionActivity: require("./promotion-activity-model"),
};
