import React from "react";
import "../styles/login.css";

const LoginComponent = () => {
  return (
    <div class="container">
      <main>
        <div class="title">
          <img src="/images/ic-logo.png" alt="Logo" />
        </div>
        <div class="login-box">
          <div>
            <label for="exampleFormControlInput1" class="form-label">
              請輸入您的信箱(Please Input Your Email)
            </label>
            <input
              type="email"
              class="form-control"
              placeholder="name@example.com"
            ></input>
          </div>

          <div class="login">
            <button type="button" class="login-btn">
              登入
            </button>
          </div>
          <p>*本系統僅限官方人員使用</p>
        </div>
      </main>

      <footer>
        <p>Copyright © 2025 OnlyFriends by Leinotek Co,.Ltd.</p>
      </footer>
    </div>
  );
};

export default LoginComponent;
