import axios from "axios";

//Web 本地
const BASE_URL = "http://localhost:8080/api/auth";
//開發環境
//const BASE_URL = "https://dev.ofs.leinotek.com/api/auth";
//正式環境
//const BASE_URL = "https://ofs.leinotek.com/api/auth";

class AuthService {
  officialLogin(userEmail) {
    return axios.post(BASE_URL + "/official-login", { userEmail });
  }

  logout() {
    //移除本地儲存的使用者 item
    localStorage.removeItem("userToken");
  }

  //用戶帳號登入
  loginAccount(userEmail) {
    return axios.post(BASE_URL + "/login", { userEmail });
  }

  //帳戶帳號刪除
  deleteAccount(userToken, userEmail) {
    return axios.post(
      BASE_URL + "/delete",
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
}

export default new AuthService();
