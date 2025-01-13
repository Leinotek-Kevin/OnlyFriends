import axios from "axios";

const BASE_URL = "http://localhost:8080/api/auth";

class AuthService {
  login(userEmail) {
    return axios.post(BASE_URL + "/official-login", { userEmail });
  }

  logout() {
    //移除本地儲存的使用者 item
    localStorage.removeItem("userToken");
  }

  getUserToken() {
    return localStorage.getItem("userToken");
  }
}

export default new AuthService();
