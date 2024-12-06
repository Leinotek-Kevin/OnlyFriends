const ReportReasons = Object.freeze([
  { reasonID: "0", description: "頭像/資料不實" },
  { reasonID: "1", description: "惡意話語/攻擊" },
  { reasonID: "2", description: "惡意騷擾" },
  { reasonID: "3", description: "色情低俗" },
  { reasonID: "4", description: "疑似詐騙/釣魚" },
  { reasonID: "5", description: "廣告/銷售" },
  { reasonID: "6", description: "未成年" },
  { reasonID: "7", description: "其他原因" },
]);

module.exports = {
  ReportReasons,
};
