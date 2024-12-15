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

module.exports = {
  isGroupChannelExist,
  deleteGroupChannel,
  createGroupChannel,
  queryGroupChannel,
};
