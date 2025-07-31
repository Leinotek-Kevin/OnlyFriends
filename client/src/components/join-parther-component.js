import React, { useState } from "react";
import "../styles/join-parther.css";
const JoinPartherComponent = ({ userToken, setUserToken }) => {
  return (
    <div className="join-parther">
      <div className="join-steps">
        <p>歡迎加入 👉 OnlyFriends 推廣計劃</p>

        <img src={`/images/bg-parther-steps.png`} alt="推廣者申請橫幅" />
      </div>

      <div className="parther-enter">
        <div className="des">
          <p className="title">
            🌱 加入 OnlyFriends 推廣夥伴<br></br>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;讓想交朋友的你，遇見真正懂你的人
          </p>
          <p className="sub-title">
            只要有人透過你的『專屬推廣碼』註冊並完成訂閱， 你將獲得 OnlyFriends
            提供的訂閱分潤，不需要成為網紅，只要願意分享你認同的價值，
            加入我們，一起拓展人脈圈、分享靈感，讓交友和創作都能自然發生。
          </p>
        </div>
        <div className="apply">
          <p>👉 申請成為推廣者</p>
          <input
            type="text"
            placeholder="請輸入您的用戶ID"
            oninput="this.value = this.value.replace(/[^a-zA-Z0-9]/g, '')"
          />
          <button>送出申請</button>
        </div>
      </div>
    </div>
  );
};

export default JoinPartherComponent;
