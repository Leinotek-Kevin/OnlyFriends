const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const SendBird = require("sendbird");
const sb = new SendBird({ appId: process.env.SENDBIRD_APP_ID });
const generalUtil = require("../utils/general-util");

//建立＆更新用戶
const createAndUpdateUser = async (userID, userName, userPhoto) => {
  return new Promise((resolve, reject) => {
    // 先連接 SendBird，用戶不存在則創建
    sb.connect(userID, function (user, error) {
      if (error) {
        return reject(error);
      }

      userName = userName || "";
      userPhoto = userPhoto || "";

      // 連接成功後，立即更新暱稱
      sb.updateCurrentUserInfo(userName, userPhoto, function (response, error) {
        if (error) {
          return reject(error);
        }
        resolve(response); // 暱稱更新成功
      });
    });
  });
};

const isGroupChannelExist = async (channelUrl) => {
  // SendBird API URL
  const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/group_channels/${channelUrl}`;

  // API Token
  const apiToken = process.env.SENDBIRD_API_TOKEN;

  // Request Headers
  const headers = {
    "Content-Type": "application/json, charset=utf8",
    "Api-Token": apiToken,
  };

  console.log(process.env.SENDBIRD_APP_ID);
  console.log(process.env.SENDBIRD_API_TOKEN);

  return axios
    .get(url, { headers })
    .then((response) => {
      let { status } = response;
      if (status == 200) {
        return response.data;
      }
    })
    .catch((e) => {
      let { status } = e;
      if (status == 400) {
        return null;
      }
    });
};

const deleteGroupChannel = async (channelUrl) => {
  console.log("目標 sendbird url ", channelUrl);
  // SendBird API URL
  const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/group_channels/${channelUrl}`;

  // API Token
  const apiToken = process.env.SENDBIRD_API_TOKEN;

  // Request Headers
  const headers = {
    "Content-Type": "application/json, charset=utf8",
    "Api-Token": apiToken,
  };

  return axios
    .delete(url, { headers })
    .then((response) => {
      let { status } = response;

      if (status == 200) {
        console.log("目標 sendbird url ", "刪除成功");
        return true;
      }

      return false;
    })
    .catch((e) => {
      console.log(e);
      let { status } = e;
      if (status == 400) {
        console.log("目標 sendbird url ", "刪除失敗");
        console.log("deleteGroupChannel", e);
        return false;
      }
    });
};

const createGroupChannel = async (channelUrl, cover) => {
  //房間配對對象
  let [user1ID, user2ID] = channelUrl.split("_");

  // SendBird API URL
  const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/group_channels`;

  // API Token
  const apiToken = process.env.SENDBIRD_API_TOKEN;

  // Request Headers
  const headers = {
    "Content-Type": "application/json, charset=utf8",
    "Api-Token": apiToken,
  };

  // Request Body (JSON data)
  const data = {
    name: user1ID + "&" + user2ID + "的房間",
    channel_url: channelUrl,
    cover_url: cover,
    custom_type: "chat",
    is_distinct: true,
    user_ids: [user1ID, user2ID],
    operator_ids: [process.env.SENDBIRD_OPERATOR_ID],
  };

  return axios
    .post(url, data, { headers })
    .then((response) => {
      let { status } = response;

      if (status == 200) {
        return true;
      }
    })
    .catch((e) => {
      let { status } = e;
      if (status == 400) {
        return false;
      }
    });
};

const queryGroupChannel = async (channelUrl) => {
  // SendBird API URL
  const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/group_channels/${channelUrl}`;

  // API Token
  const apiToken = process.env.SENDBIRD_API_TOKEN;

  // Request Headers
  const headers = {
    "Content-Type": "application/json, charset=utf8",
    "Api-Token": apiToken,
  };

  return axios
    .get(url, { headers })
    .then((response) => {
      let { status } = response;

      if (status == 200) {
        return response.data;
      }
    })
    .catch((e) => {
      let { status } = e;
      if (status == 400) {
        return null;
      }
    });
};

const updateGroupChannel = async (channelUrl, cover) => {
  // SendBird API URL
  const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/group_channels/${channelUrl}`;

  // API Token
  const apiToken = process.env.SENDBIRD_API_TOKEN;

  // Request Headers
  const headers = {
    "Content-Type": "application/json, charset=utf8",
    "Api-Token": apiToken,
  };

  // Request Body (JSON data)
  const data = {
    cover_url: cover,
  };

  return axios
    .put(url, data, { headers })
    .then((response) => {
      let { status } = response;

      if (status == 200) {
        return true;
      }
    })
    .catch((e) => {
      let { status } = e;
      if (status == 400) {
        return false;
      }
    });
};

const sendMsgGroupChannel = async (channelUrl, userID, msg) => {
  // SendBird API URL
  const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/group_channels/${channelUrl}/messages`;

  // API Token
  const apiToken = process.env.SENDBIRD_API_TOKEN;

  // Request Headers
  const headers = {
    "Content-Type": "application/json, charset=utf8",
    "Api-Token": apiToken,
  };

  // Request Body (JSON data)
  const data = {
    message_type: "MESG",
    user_id: userID,
    message: msg,
    custom_type: "message",
  };

  return axios
    .post(url, data, { headers })
    .then((response) => {
      let { status } = response;

      if (status == 200) {
        return true;
      }
    })
    .catch((e) => {
      let { status } = e;
      if (status == 400) {
        return false;
      }
    });
};

const lastMsgGroupChannel = async (channelUrl) => {
  // SendBird API URL
  const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/group_channels/${channelUrl}/messages?message_ts=0&next_limit=100`;

  // API Token
  const apiToken = process.env.SENDBIRD_API_TOKEN;

  // Request Headers
  const headers = {
    "Content-Type": "application/json, charset=utf8",
    "Api-Token": apiToken,
  };

  return axios
    .get(url, { headers })
    .then((response) => {
      let { status } = response;

      if (status == 200) {
        return response.data.messages;
      }
    })
    .catch((e) => {
      let { status } = e;
      if (status == 400) {
        return [];
      }
    });
};

const deleteUser = async (userID) => {
  // SendBird API URL
  const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/users/${userID}`;

  // API Token
  const apiToken = process.env.SENDBIRD_API_TOKEN;

  // Request Headers
  const headers = {
    "Content-Type": "application/json, charset=utf8",
    "Api-Token": apiToken,
  };

  return axios
    .delete(url, { headers })
    .then((response) => {
      let { status } = response;

      if (status == 200) {
        return true;
      }
    })
    .catch((e) => {
      let { status } = e;
      if (status == 400) {
        return false;
      }
    });
};

const deleteMsg = async (channelUrl) => {
  // SendBird API URL
  const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/group_channels/${channelUrl}/messages`;

  // API Token
  const apiToken = process.env.SENDBIRD_API_TOKEN;

  // Request Headers
  const headers = {
    "Content-Type": "application/json, charset=utf8",
    "Api-Token": apiToken,
  };

  return axios
    .delete(url, { headers })
    .then((response) => {
      let { status } = response;

      if (status == 200) {
        return true;
      }
    })
    .catch((e) => {
      let { status } = e;
      if (status == 400) {
        return false;
      }
    });
};

const removeRegisterToken = async (osType, userID, deviceToken) => {
  const toeknType = osType == "1" ? "apns" : "gcm";

  // SendBird API URL
  const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/users/${userID}/push/${toeknType}/${deviceToken}`;

  // API Token
  const apiToken = process.env.SENDBIRD_API_TOKEN;

  // Request Headers
  const headers = {
    "Content-Type": "application/json, charset=utf8",
    "Api-Token": apiToken,
  };

  return axios
    .delete(url, { headers })
    .then((response) => {
      let { status } = response;

      if (status == 200) {
        return true;
      }
    })
    .catch((e) => {
      let { status } = e;
      if (status == 400) {
        return false;
      }
    });
};

// openChannel
const sendMsgOpenChannel = async (msg, link, image, customType) => {
  // SendBird API URL
  const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/open_channels/${process.env.SENDBIRD_OPEN_CHANNEL}/messages`;

  // API Token
  const apiToken = process.env.SENDBIRD_API_TOKEN;

  // Request Headers
  const headers = {
    "Content-Type": "application/json, charset=utf8",
    "Api-Token": apiToken,
  };

  const innerData = {
    link: "",
    image: "",
  };

  if (link) {
    innerData.link = link;
  }

  if (image) {
    innerData.image = image;
  }

  // Request Body (JSON data)
  const requestData = {
    message_type: "MESG",
    user_id: process.env.SENDBIRD_OPERATOR_ID,
    message: msg,
    custom_type: customType,
    data: JSON.stringify(innerData),
  };

  if (link) {
    requestData.data.link = link;
  }

  if (image) {
    requestData.data.image = image;
  }

  return axios
    .post(url, requestData, { headers })
    .then((response) => {
      let { status } = response;

      if (status == 200) {
        return true;
      }
    })
    .catch((e) => {
      let { status } = e;
      if (status == 400) {
        return false;
      }
    });
};

//更新已存在的用戶
const updateExistUser = async (userId, nickname, profileUrl) => {
  const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/users/${userId}`;

  const headers = {
    "Content-Type": "application/json",
    "Api-Token": process.env.SENDBIRD_API_TOKEN,
  };

  const body = {};

  if (generalUtil.isNotNUllEmpty(nickname)) {
    body.nickname = nickname;
  }

  if (generalUtil.isNotNUllEmpty(profileUrl)) {
    body.profile_url = profileUrl;
  }

  // const body = {
  //   nickname: nickname,
  //   profile_url: profileUrl,
  // };

  try {
    const res = await axios.put(url, body, { headers });
    // console.log("更新成功:", res.data);
  } catch (e) {
    console.log(e);
  }
};

module.exports = {
  isGroupChannelExist,
  deleteGroupChannel,
  createGroupChannel,
  queryGroupChannel,
  updateGroupChannel,
  sendMsgGroupChannel,
  lastMsgGroupChannel,
  deleteUser,
  deleteMsg,
  sendMsgOpenChannel,
  createAndUpdateUser,
  removeRegisterToken,
  updateExistUser,
};
