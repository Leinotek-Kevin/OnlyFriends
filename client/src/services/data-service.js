import axios from "axios";

const isDebug = process.env.REACT_APP_ENV === "DEBUG";
const isLocal = process.env.REACT_APP_ENV === "LOCAL";

const BASE_API_URL = isLocal
  ? "http://localhost:8080/api/center"
  : isDebug
  ? "https://dev.ofs.leinotek.com/api/center"
  : "https://ofs.leinotek.com/api/center";

class DataService {
  //取得基本數據
  getGeneralData(userToken) {
    return axios.post(
      BASE_API_URL + "/general-data",
      {},
      {
        headers: {
          Authorization: userToken,
        },
      }
    );
  }
}

export default new DataService();
