import React, { useState } from "react";
import "../styles/parther-data.css";
import UserService from "../services/user-service";
import FullScreenLoading from "./widget/full-screen-loading";
import { showModalMessage } from "./widget/modeal-msg-dialog";
import DateRangeSelector from "../components/widget/range-picker"; // 路徑依你的專案調整
import { Checkbox } from "antd";

const PartherDataComponent = ({ userToken, setUserToken }) => {
  const [loading, setLoading] = useState(false);
  const [isPromoterMode, setIsPromoterMode] = useState(false);
  const [promoterId, setPromoterId] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const handleQueryData = async (e) => {
    // console.log("開始日期", dateRange.startDate);
    // console.log("結束日期", dateRange.endDate);

    if (!dateRange.startDate || !dateRange.endDate) {
      showModalMessage({
        type: "error",
        title: "錯誤！",
        content: "請選擇要查詢的日期區間",
      });
    }

    const response = await UserService.getPromterData(
      userToken,
      "",
      dateRange.startDate,
      dateRange.endDate
    );

    // if (isPromoterMode) {
    //   if (promoterId == "" || !promoterId) {
    //     showModalMessage({
    //       type: "error",
    //       title: "錯誤！",
    //       content: "請輸入正確的推廣者ID",
    //     });
    //   }
    // }
    //setLoading(true);
  };

  const handleBoxChange = (e) => {
    setIsPromoterMode(e.target.checked);
    if (!e.target.checked) {
      setPromoterId(""); // 取消勾選時清空輸入框
    }
  };

  // 限制輸入最大 10 個字
  const handleInputChange = (e) => {
    const value = e.target.value;
    if (value.length <= 10) {
      setPromoterId(value);
    }
  };

  return (
    <div className="parther-data">
      <FullScreenLoading loading={loading} />

      <div className="admin-header">
        <p>😀 Kevin 您好！</p>
      </div>

      <div className="top-board">
        <p className="title">推廣數據</p>

        <div className="inner">
          <div className="input">
            <Checkbox onChange={handleBoxChange}></Checkbox>

            <div className="promter-id">
              <input
                type="text"
                placeholder="請輸入推廣者ID"
                value={promoterId}
                onChange={handleInputChange}
                disabled={!isPromoterMode}
              />
            </div>

            <DateRangeSelector onChange={setDateRange} />

            <button onClick={handleQueryData}>查看數據</button>
          </div>

          <div className="promoter-info">
            <div className="item-info">
              <i>123</i>
              <p>球場大帥哥 /</p>
            </div>

            <div className="item-info">
              <p>123456789</p>
              <i>123</i>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard">
        <div className="simple-board">
          <div className="simple-data">
            <p>推廣兌換數</p>
            <div className="div-line"></div>
          </div>
          <div className="h-space"></div>
          <div className="simple-data">
            <p>推廣訂閱數</p>
            <div className="div-line"></div>
          </div>
          <div className="h-space"></div>
          <div className="simple-data">
            <p>訂閱轉化率</p>
            <div className="div-line"></div>
          </div>
          <div className="h-space"></div>
          <div className="simple-data">
            <p>預估總收益</p>
            <div className="div-line"></div>
          </div>
          <div className="h-space"></div>
          <div className="simple-data">
            <p>聯盟分潤</p>
            <div className="div-line"></div>
          </div>
          <div className="h-space"></div>
          <div className="simple-data">
            <p>回饋級距</p>
            <div className="div-line"></div>
          </div>
        </div>

        <div className="v-space"></div>

        <div className="complex-board">
          <div className="complex-chart"></div>
          <div className="h-space"></div>
          <div className="complex-chart"></div>
        </div>

        <div className="v-space"></div>

        <div className="complex-board">
          <div className="complex-chart"></div>
          <div className="h-space"></div>
          <div className="complex-chart"></div>
        </div>
      </div>
    </div>
  );
};

// * 匯款資訊（前提是有需要領錢，不一定要顯示在儀表板上）
// * 名稱
// * 信箱
// * 使用者 id
// * 目前推薦碼兌換數量
// * 目前該兌換碼之使用者訂閱數量
// * 訂閱轉換率
// * 訂閱項目比例
// * 回饋級距
// * 活動期限
// * 預估收益（因為可能會有退款的使用者）
// * 使用推薦碼性別比例
// * 訂閱者性別比例

export default PartherDataComponent;
