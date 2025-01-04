import axios from "axios";

const API_URL = "https://mern.leinotek.com/api/user";
// const API_URL = "http://localhost:8080/api/user";

class AuthService {
  login(email, password) {
    return axios.post(API_URL + "/login", { email, password });
  }
  logout() {
    //移除本地儲存的使用者 item
    localStorage.removeItem("user");
  }
  register(username, email, password, role) {
    //會 return 一個 promise object
    return axios.post(API_URL + "/register", {
      username,
      email,
      password,
      role,
    });
  }

  getCurrentUser() {
    return JSON.parse(localStorage.getItem("user"));
  }
}

export default new AuthService();
