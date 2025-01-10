const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

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
      console.log("deleteGroupChannel", response);
      let { status } = response;

      if (status == 200) {
        return true;
      }

      return false;
    })
    .catch((e) => {
      let { status } = e;
      if (status == 400) {
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

// openChannel
const sendMsgOpenChannel = async (msg, customType) => {
  // SendBird API URL
  const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/open_channels/${process.env.SENDBIRD_OPEN_CHANNEL}/messages`;

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
    user_id: process.env.SENDBIRD_OPERATOR_ID,
    message: msg,
    custom_type: customType,
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
};
