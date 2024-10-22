const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const routes = require("./routes");
const cors = require("cors");
const port = process.env.PORT || 8080;
const admin = require("./utils/checkAdmin-util");
const passport = require("passport");
require("./config/passport")(passport);

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
app.use("/api/auth", routes.auth);
app.use(
  "/api/user",
  passport.authenticate("jwt", { session: false }),
  routes.user
);

//監聽 http request
app.listen(port, () => {
  console.log("後端伺服器聆聽中....");
});
