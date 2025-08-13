import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "../../styles/parther-admin.css";
import AuthService from "../../services/auth-service";
import mobileEnterBg from "../../images/drinks/bg-drink-quiz-m-enter.jpg";
import logo from "../../images/ic-logo-black.png";
import { showModalMessage } from "../../components/widget/modeal-msg-dialog";
import FullScreenLoading from "../../components/widget/full-screen-loading";

const PartherAdminComponent = ({ userToken, setUserToken }) => {
  const [loading, setLoading] = useState(false);
  let navigate = useNavigate();
  const [promoterId, setPromoterId] = useState("");

  // 限制輸入最大 10 個字
  const handleInputIDChange = (e) => {
    const value = e.target.value;
    if (value.length <= 10) {
      setPromoterId(value);
    }
  };

  //處理登入邏輯
  const handleLogin = async (e) => {
    if (promoterId == null || promoterId == "") {
      return showModalMessage({
        type: "error",
        title: "錯誤！",
        content: "請檢查您的 ID 是否輸入正確！",
      });
    }

    setLoading(true);
    const response = await AuthService.loginPromoter(promoterId);

    if (response.data.data.resultCode == 1) {
      //將使用者的登入訊息存在本地
      localStorage.setItem("userToken", response.data.data.token);
      setUserToken(AuthService.getUserToken());
      navigate("/parther-dashboard", {
        state: { promoterId: response.data.data.promoterID },
      });
    } else {
      return showModalMessage({
        type: "error",
        title: "錯誤！",
        content: "請檢查您的 ID 是否輸入正確！",
      });
    }

    setLoading(false);
  };

  //   const handleLogin = async () => {
  //     try {
  //       if (email) {
  //         let response = await AuthService.officialLogin(email);
  //         let validCode = response.data.validCode;

  //         if (validCode == 1) {
  //           //將使用者的登入訊息存在本地
  //           localStorage.setItem("userToken", response.data.token);
  //           setUserToken(AuthService.getUserToken());
  //           navigate("/dashboard");
  //         } else {
  //           setMessage(response.data.message);
  //         }
  //       } else {
  //         setMessage("尚未輸入您的信箱！");
  //       }
  //     } catch (e) {
  //       setMessage(e.response.data.message);
  //     }
  //   };

  return (
    <div className="parther-admin">
      <FullScreenLoading loading={loading} />
      <img src={mobileEnterBg} alt="背景" className="background" />
      <main>
        <img src={logo} alt="logo" className="logo" />

        <div className="enter-card">
          <div className="title">
            <p>聯盟夥伴數據系統</p>
          </div>

          <div className="enter">
            <p>* 本系統僅提供給 Only Friends 聯盟夥伴</p>

            <input
              type="text"
              placeholder="請輸入 Only Friends 用戶ID"
              value={promoterId}
              onChange={handleInputIDChange}
            />
            <button onClick={handleLogin}>登入</button>
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

export default PartherAdminComponent;
