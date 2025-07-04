const jwt = require("jsonwebtoken");

const isNotNUllEmpty = (reqStr) => {
  return reqStr != null && reqStr != "";
};

const isNullOrEmpty = (reqStr) => {
  return reqStr == undefined || reqStr == null || reqStr == "";
};

const decodeSignInfoByJWT = (jwtStr) => {
  try {
    const decodeInfo = jwt.decode(jwtStr, {
      complete: false,
    });
    //complete -> true : 返回 header、payload 和 signature ,
    //complete -> false : 返回 payload
    return decodeInfo;
  } catch (error) {
    return null;
  }
};

module.exports = { isNotNUllEmpty, decodeSignInfoByJWT, isNullOrEmpty };
