import React, { useState } from "react";
import "../styles/join-parther.css";
import UserService from "../services/user-service";
import FullScreenLoading from "./widget/full-screen-loading";
import { showModalMessage } from "./widget/modeal-msg-dialog";

const JoinPartherComponent = ({ userToken, setUserToken }) => {
  const [loading, setLoading] = useState(false);
  let [applyID, setApplyID] = useState("");

  const handleChangeApplyID = (e) => {
    setApplyID(e.target.value);
  };

  //申請加入推廣者
  const handleJoin = async (e) => {
    try {
      setLoading(true);
      const response = await UserService.joinParther(userToken, applyID);
      let status = response.data.status;

      setLoading(false);

      if (status) {
        //API 成功回應
        if (response.data.data) {
          const { queryCode, activityID, promotionCode, promoterID } =
            response.data.data;

          if (queryCode == "2") {
            showModalMessage({
              type: "success",
              title: "申請成功",
              content: (
                <>
                  <br />
                  恭喜您！歡迎您加入 Only Friends 推廣者
                  <br />
                  <strong>這是您的推廣碼：{promotionCode}</strong>
                  <br />
                  <br />
                  😆小提醒：如果您忘記推廣碼，可透過系統再次查詢！
                </>
              ),
            });
          } else {
            showModalMessage({
              type: "error",
              title: "申請失敗",
              content: response.data.message,
            });
          }
        }
      } else {
        showModalMessage({
          type: "error",
          title: "系統錯誤",
          content: response.data.message,
        });
      }
    } catch (e) {
      showModalMessage({
        type: "error",
        title: "系統錯誤",
        content: e,
      });
    }
  };

  return (
    <div className="join-parther">
      <FullScreenLoading loading={loading} />

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
            onChange={handleChangeApplyID}
          />
          <button onClick={handleJoin}>送出申請</button>
        </div>
      </div>
    </div>
  );
};

export default JoinPartherComponent;
