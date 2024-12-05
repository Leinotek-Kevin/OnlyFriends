const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const routes = require("./routes");
const cors = require("cors");
const port = process.env.PORT || 8080;
const Config = require("./models").config;
const admin = require("./utils/checkAdmin-util");
const passport = require("passport");
require("./config/passport")();

//連結 mongoDB
mongoose
  .connect(process.env.MONGODB_CONNECTION)
  .then(() => {
    console.log("連結到 mongoDB");
  })
  .catch((e) => {
    console.log(e);
  });

//middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

//Handle Router
app.use("/api/test", routes.test);
app.use("/api/auth", routes.auth);
app.use("/api/user", routes.user);
app.use("/api/letter", routes.letter);
app.use("/api/system", routes.system);
app.use("/api/purchase", routes.purchase);

//監聽 http request
app.listen(port, () => {
  console.log("後端伺服器聆聽中....");
});

//檢查目前系統環境
const systemCheck = async () => {
  const config = await Config.findOne();

  if (config == null) {
    await Config.create({
      chatCover: "",
      matchRecord: {
        general: {
          status: "0",
        },
        letter: {
          status: "0",
        },
      },
    });
  }
};
systemCheck();

//執行午夜配對和樹洞配對和確認公開渠道
