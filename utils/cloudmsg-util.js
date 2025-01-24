const admin = require("./checkAdmin-util");

class CloudMsgService {
  // 發送推播(針對 iOS 設備)
  static async sendMsgToIOSDevice(deviceTokens, data) {
    let { title, body, image, behaviorType, navigateSign } = data;

    // 發送到指定設備
    try {
      deviceTokens.forEach(async (token) => {
        const message = {
          token, // 傳入多個設備ID
          notification: {
            title,
            body,
            image,
          },
          apns: {
            payload: {
              aps: {
                sound: "default", // iOS 的通知聲音，使用系統預設聲音
              },
            },
          },
          data: {
            title,
            body,
            image,
            behaviorType,
            navigateSign,
            isNotification: "1",
          },
        };
        admin
          .messaging()
          .send(message)
          .catch((error) => {
            if (error.code === "messaging/registration-token-not-registered") {
              console.log("無效的設備 token", token);
            } else {
              console.log("發送通知時出錯:", error);
            }
          })
          .then((response) => {
            console.log("發送結果 ", response + "=>" + token);
          });
      });

      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  // 發送推播(針對 Android 設備)
  static async sendMsgToAndroidDevice(deviceTokens, data) {
    let { title, body, image, behaviorType, navigateSign } = data;

    // 發送到指定設備
    try {
      deviceTokens.forEach(async (token) => {
        const message = {
          token, // 傳入多個設備ID
          data: {
            title,
            body,
            image,
            behaviorType,
            navigateSign,
            isNotification: "1",
          },
          android: {
            priority: "high", // 高優先級，確保背景下也能接收
          },
        };
        admin
          .messaging()
          .send(message)
          .catch((error) => {
            if (error.code === "messaging/registration-token-not-registered") {
              console.log("無效的設備 token", token);
            } else {
              console.log("發送通知時出錯:", error);
            }
          })
          .then((response) => {
            console.log("發送結果 ", response + "=>" + token);
          });
      });

      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  // 發送推播(針對主題-iOS)
  static async sendMsgToIOSTopic(topic, newData) {
    let { title, body, image, behaviorType, navigateSign } = newData;
    const message = {
      notification: {
        title,
        body,
        image,
      },

      apns: {
        payload: {
          aps: {
            sound: "default", // iOS 的通知聲音，使用系統預設聲音
          },
        },
      },
      data: {
        title,
        body,
        image,
        behaviorType,
        navigateSign,
        isNotification: "1",
      },

      topic, // 指定主題
    };

    // 發送到指定主題
    try {
      admin
        .messaging()
        .send(message)
        .then((response) => {
          console.log("發送主題通知:", response);
        })
        .catch((error) => {
          console.log("發送主題通知時出錯:", error);
        });
      return true;
    } catch (e) {
      console.log("推播主題失敗", e);
      return false;
    }
  }

  // 發送推播(針對主題-Android)
  static async sendMsgToAndroidTopic(topic, newData) {
    let { title, body, image, behaviorType, navigateSign } = newData;
    const message = {
      data: {
        title,
        body,
        image,
        behaviorType,
        navigateSign,
        isNotification: "1",
      },

      android: {
        priority: "high", // 高優先級，確保背景下也能接收
      },

      topic, // 指定主題
    };

    // 發送到指定主題
    try {
      admin
        .messaging()
        .send(message)
        .then((response) => {
          console.log("發送主題通知:", response);
        })
        .catch((error) => {
          console.log("發送主題通知時出錯:", error);
        });
      return true;
    } catch (e) {
      console.log("推播主題失敗", e);
      return false;
    }
  }
}

module.exports = CloudMsgService;
