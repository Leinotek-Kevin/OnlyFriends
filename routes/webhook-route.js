const router = require("express").Router();

router.post("/google", async (req, res) => {
  try {
    return res.status(200).send({
      status: true,
      message: "收到 google 的消息",
      req,
    });
  } catch (e) {
    console.log("收到異常 google 消息", e);
    return res.status(500).send({
      status: false,
      message: "收到異常 google 消息",
      e,
    });
  }
});

module.exports = router;
