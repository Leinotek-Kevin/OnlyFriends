const admin = require("../utils/checkAdmin-util");
const { v4: uuidv4 } = require("uuid");

//獲取 Firestore 實例
const db = admin.firestore();

//添加資料
async function addMessage(message) {
  // announcement 文件的引用
  const announcementRef = db.collection("sb_openchannel").doc("announcement");

  const uuid = uuidv4(); // 生成 UUID v4

  // 要插入的消息物件
  const newItem = {
    messageID: uuid.replace(/\D/g, "").slice(0, 8),
    customType: message.customType,
    msg: message.msg,
    link: message.link,
    image: message.image,
    time: Date.now(),
  };

  try {
    // 使用 arrayUnion 將新的消息加入到 messages 陣列中
    await announcementRef.update({
      messages: admin.firestore.FieldValue.arrayUnion(newItem),
    });
    console.log("Message added successfully!");
    return 1;
  } catch (error) {
    console.error("Error adding message: ", error);
    return -1;
  }
}

//取得資料
async function getAnnouncement() {
  // 獲取 sb_openchannel 集合中的 announcement 文件
  const announcementRef = db.collection("sb_openchannel").doc("announcement");

  try {
    // 使用 get() 方法來取得文件資料
    const doc = await announcementRef.get();
    if (doc.exists) {
      // 如果文件存在，打印文件資料
      console.log("Document data:", doc.data());
      return doc.data();
    } else {
      console.log("No such document!");
      return null;
    }
  } catch (error) {
    console.error("Error getting document: ", error);
    return null;
  }
}

//刪除指定類型資料
async function removeMessagesByType(strType) {
  // 獲取 sb_openchannel 集合中的 announcement 文件
  const announcementRef = db.collection("sb_openchannel").doc("announcement");

  try {
    // 先獲取文件資料
    const doc = await announcementRef.get();

    if (doc.exists) {
      const data = doc.data();
      const messages = data.messages;
      console.log(strType);
      console.log(messages);

      // 過濾出 customType 開頭是 "match" 的消息
      const matchMessages = messages.filter(
        (message) =>
          message.customType && message.customType.startsWith(strType)
      );

      console.log(matchMessages);

      // 使用 arrayRemove 刪除這些消息
      matchMessages.forEach(async (message) => {
        await announcementRef.update({
          messages: admin.firestore.FieldValue.arrayRemove(message),
        });
      });

      return 1;
    } else {
      return -1;
    }
  } catch (error) {
    return -1;
  }
}

module.exports = {
  addMessage,
  removeMessagesByType,
  getAnnouncement,
};
