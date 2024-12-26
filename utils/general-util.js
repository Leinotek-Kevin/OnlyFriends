const jwt = require("jsonwebtoken");

const isNotNUllEmpty = (reqStr) => {
  return reqStr != null && reqStr != "";
};

const decodeSignInfoByJWT = (jwtStr) => {
  try {
    const transcationInfo = jwt.decode(jwtStr, {
      complete: false,
    });
    //complete -> true : 返回 header、payload 和 signature ,
    //complete -> false : 返回 payload
    return transcationInfo;
  } catch (error) {
    return null;
  }
};

module.exports = { isNotNUllEmpty, decodeSignInfoByJWT };
