const router = require("express").Router();

router.post("/google", async (req, res) => {
  try {
    console.log("Received Google request:", req.body); // Logs the parsed body

    return res.status(200).send({
      status: true,
      message: "收到 google 的消息",
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
