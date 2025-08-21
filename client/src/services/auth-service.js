import axios from "axios";

const isDebug = process.env.REACT_APP_ENV === "DEBUG";
const isLocal = process.env.REACT_APP_ENV === "LOCAL";

const BASE_API_URL = isLocal
  ? "http://localhost:8080/api/auth"
  : isDebug
  ? "https://dev.ofs.leinotek.com/api/auth"
  : "https://ofs.leinotek.com/api/auth";

//Web 本地
//const BASE_URL = "http://localhost:8080/api/auth";
//開發環境
//const BASE_URL = "https://dev.ofs.leinotek.com/api/auth";
//正式環境
// const BASE_URL = "https://ofs.leinotek.com/api/auth";

class AuthService {
  officialLogin(userEmail) {
    return axios.post(BASE_API_URL + "/official-login", { userEmail });
  }

  logout() {
    //移除本地儲存的使用者 item
    localStorage.removeItem("userToken");
  }

  //用戶帳號登入
  loginAccount(userEmail) {
    return axios.post(BASE_API_URL + "/login", { userEmail });
  }

  //帳戶帳號刪除
  deleteAccount(userToken, userEmail) {
    return axios.post(
      BASE_API_URL + "/delete",
      { userEmail }, // 把 userEmail 放到 body
      {
        headers: {
          Authorization: userToken,
        },
      }
    );
  }

  getUserToken() {
    return localStorage.getItem("userToken");
  }

  //推廣者系統登入
  loginPromoter(promoterID) {
    return axios.post(BASE_API_URL + "/promoter-login", { promoterID });
  }
}

export default new AuthService();
