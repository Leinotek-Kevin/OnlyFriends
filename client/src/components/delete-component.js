import React, { useState } from "react";
import { ToastContainer } from "react-toastify";
import "../styles/delete.css";
import AuthService from "../services/auth-service";

const DeleteComponent = () => {
  let [email, setEmail] = useState("");
  let [message, setMessage] = useState("");

  const handleChangeEmail = (e) => {
    setEmail(e.target.value);
  };

  const handleDelete = async () => {
    try {
      setMessage("");
      if (email) {
        let response = await AuthService.loginAccount(email);
        let validCode = response.data.validCode;

        if (validCode == 1) {
          //用戶的 JWT
          let userToken = response.data.token;

          try {
            let result = await AuthService.deleteAccount(userToken, email);
            setEmail("");
            setMessage("");
            let isDeleteSuccess = result.status == 200;
            alert(isDeleteSuccess ? "已刪除您的帳號！" : "帳號刪除失敗！");
          } catch (e) {
            setEmail("");
            setMessage("");
            alert("帳號刪除失敗！");
          }
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
    <div className="container">
      <main>
        <div className="title">
          <img src="/images/ic-logo.png" alt="Logo" />
        </div>
        <div className="delete-box">
          <div>
            <label for="exampleFormControlInput1" className="form-label">
              請輸入您的信箱(Please Input Your Email)
            </label>
            <input
              type="email"
              className="form-control"
              placeholder="name@example.com"
              value={email}
              onChange={handleChangeEmail}
            ></input>
            {message && <div className="alert alert-danger">{message}</div>}
          </div>

          <div className="delete">
            <button type="button" className="delete-btn" onClick={handleDelete}>
              刪除
            </button>
          </div>
        </div>
      </main>
      <footer>
        <p>Copyright © 2025 OnlyFriends by Leinotek Co,.Ltd.</p>
      </footer>
      <ToastContainer /> {/* 確保這個容器存在 */}
    </div>
  );
};

export default DeleteComponent;
