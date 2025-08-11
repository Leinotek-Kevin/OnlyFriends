import axios from "axios";
import dayjs from "dayjs";

//Web 本地
const BASE_URL = "http://localhost:8080/api/user";
//開發環境
//const BASE_URL = "https://dev.ofs.leinotek.com/api/user";
//正式環境
//const BASE_URL = "https://ofs.leinotek.com/api/user";

class UserService {
  //加入聯盟行銷夥伴
  joinParther(userToken, userID) {
    return axios.post(
      BASE_URL + "/apply-promoter",
      { activityID: "100", userID }, // 把 userID 放到 body
      {
        headers: {
          Authorization: userToken,
        },
      }
    );
  }

  //獲取指定區間推廣數據資料
  getPromterData(userToken, userID, startDate, endDate, isPromoterMode) {
    // 轉成 UTC 的 timestamp（毫秒）
    const { utcStart, utcEnd } = toUTCTimestampRange(startDate, endDate);

    return axios.post(
      BASE_URL + "/ana-promoter-data",
      {
        activityID: "100",
        promoterID: userID,
        startDateTime: utcStart,
        endDateTime: utcEnd,
        isPromoterMode,
      },
      {
        headers: {
          Authorization: userToken,
        },
      }
    );
  }
}

//轉換成UTC時間區間
const toUTCTimestampRange = (startDateStr, endDateStr) => {
  const [sy, sm, sd] = startDateStr.split("-").map(Number);
  const [ey, em, ed] = endDateStr.split("-").map(Number);

  // start: 台灣時間 00:00
  const start = new Date(sy, sm - 1, sd, 0, 0, 0);

  // end: 台灣時間 23:59
  const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);

  return {
    utcStart: start.getTime(),
    utcEnd: end.getTime(),
  };
};

export default new UserService();
