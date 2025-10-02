let JwtStrategy = require("passport-jwt").Strategy;
let ExtractJwt = require("passport-jwt").ExtractJwt;
const User = require("../models").user;
const passport = require("passport");

module.exports = () => {
  let opts = {};

  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
  opts.secretOrKey = process.env.PASSPORT_SECRET;

  passport.use(
    new JwtStrategy(opts, async function (jwt_payload, done) {
      try {
        console.log("用戶權證：", jwt_payload);
        let foundUser = await User.findOne({
          userID: jwt_payload.userID,
          userEmail: jwt_payload.userEmail,
        }).exec();

        if (foundUser) {
          return done(null, foundUser); //req.user => foundUser
        } else {
          return done(null, false);
        }
      } catch (e) {
        return done(e, false);
      }
    })
  );
};
