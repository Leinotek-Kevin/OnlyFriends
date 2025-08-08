import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "../styles/login.css";
import AuthService from "../services/auth-service";
import background from "../images/bg-onlyfriends.png";

const LoginComponent = ({ userToken, setUserToken }) => {
  let navigate = useNavigate();
  let [email, setEmail] = useState("");
  let [message, setMessage] = useState("");

  const handleChangeEmail = (e) => {
    setEmail(e.target.value);
  };

  const handleLogin = async () => {
    try {
      if (email) {
        let response = await AuthService.officialLogin(email);
        let validCode = response.data.validCode;

        if (validCode == 1) {
          //將使用者的登入訊息存在本地
          localStorage.setItem("userToken", response.data.token);
          setUserToken(AuthService.getUserToken());
          navigate("/dashboard");
        } else {
          setMessage(response.data.message);
        }
      } else {
        setMessage("尚未輸入您的信箱！");
      }
    } catch (e) {
      setMessage(e.response.data.message);
    }
  };

  return (
    <div className="login-container">
      <img src={background} alt="背景" className="background" />
      <main>
        <div className="title">
          <img src="/images/ic-logo.png" alt="Logo" />
        </div>
        <div className="login-box">
          <div>
            <label for="exampleFormControlInput1" className="form-label">
              請輸入您的信箱(Please Input Your Email)
            </label>
            <input
              type="email"
              className="form-control"
              placeholder="name@example.com"
              onChange={handleChangeEmail}
            ></input>
            {message && <div className="alert alert-danger">{message}</div>}
          </div>

          <div className="login">
            <button type="button" className="login-btn" onClick={handleLogin}>
              登入
            </button>
          </div>
          <p>*本系統僅限官方人員使用</p>
        </div>
      </main>
      <footer>
        <p>Copyright © 2025 OnlyFriends by Leinotek Co,.Ltd.</p>
      </footer>
      <ToastContainer /> {/* 確保這個容器存在 */}
    </div>
  );
};

export default LoginComponent;
