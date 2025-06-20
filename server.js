const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const routes = require("./routes");
const cors = require("cors");
const port = process.env.PORT || 8080; //process.env.PORT 是 Heroku 自動動態設定的
const Config = require("./models").config;
const admin = require("./utils/checkAdmin-util");
const passport = require("passport");
const path = require("path");
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
app.use(express.static(path.join(__dirname, "client", "build")));

//Handle Router
app.use("/api/test", routes.test);
app.use("/api/sendbird", routes.sendbird);
app.use("/api/webhook", routes.webhook);

app.use("/api/auth", routes.auth);
app.use("/api/user", routes.user);
app.use("/api/letter", routes.letter);
app.use("/api/system", routes.system);
app.use("/api/purchase", routes.purchase);
app.use("/api/cloudmsg", routes.cloudmsg);
app.use("/api/circle", routes.circle);
app.use("/api/other", routes.other);

//URL/ 除了上面的 route 路徑之外的都會導到 client , index.html
if (
  process.env.NODE_ENV === "production" ||
  process.env.NODE_ENV === "staging"
) {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client", "build", "index.html"));
  });
}

//port 3000 是 React 預設
//監聽 http request
app.listen(port, () => {
  console.log("後端伺服器聆聽中....");
});

require("./service");

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

//測試分群
//require("./service/delete-circle-channel")();
