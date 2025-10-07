import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DataService from "../services/data-service";
import FullScreenLoading from "./widget/full-screen-loading";

const DataCenterComponent = ({ userToken, setUserToken }) => {
  let navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [result, setResult] = useState(null);

  async function getGeneralData() {
    try {
      setLoading(true);

      const response = await DataService.getGeneralData(userToken);

      if (response.status == 200 && response.data.data) {
        const result = response.data.data;

        setResult(result);
      }
      setLoading(false);
    } catch (error) {
      console.error("API呼叫失敗", error);
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      getGeneralData();
    }, 100); // 延遲300毫秒

    return () => clearTimeout(timer); // 組件卸載時清除定時器，避免內存洩漏
  }, [userToken]);

  return (
    <div>
      <FullScreenLoading loading={loading} />
      <h1>昨日註冊人數：{result && result.lastRegisters}</h1>
      <h1>今天註冊人數：{result && result.todayRegisters}</h1>
      <h1>註冊總人數：{result && result.allRegisters}</h1>

      {/* <h1>昨日登入人數：{result && result.lastLogins}</h1> */}
      <h1>今天登入人數：{result && result.todayLogins}</h1>

      <h1>昨日訂閱人數：{result && result.yesterdayOrders}</h1>
      <h1>今天訂閱人數：{result && result.todayOrders}</h1>
      <h1>訂閱總人數：{result && result.allOrders}</h1>

      <h1>目前女生人數：{result && result.genderCounts.female}</h1>
      <h1>目前男生生人數：{result && result.genderCounts.male}</h1>
      <h1>目前特殊人數：{result && result.genderCounts.special}</h1>
      <h1>小圈圈報名人數：{result && result.circleTickets}</h1>
    </div>
  );
};

export default DataCenterComponent;
