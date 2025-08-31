import React, { useState } from "react";
import "../styles/parther-data.css";
import UserService from "../services/user-service";
import FullScreenLoading from "./widget/full-screen-loading";
import { showModalMessage } from "./widget/modeal-msg-dialog";
import DateRangeSelector from "../components/widget/range-picker";
import { Checkbox } from "antd";
import PromoSubscribeBarChart from "./chart/promo-sub-barchart";
import ProductPieChart from "./chart/product-piechart";
import PromoGenderPieChart from "./chart/promo-gender-piechart";
import PromoAgeChart from "./chart/promo-age-chart";

const PartherDataComponent = ({ userToken, setUserToken }) => {
  const [loading, setLoading] = useState(false);
  const [isPromoterMode, setIsPromoterMode] = useState(false);
  const [promoterId, setPromoterId] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const [result, setResult] = useState(null);

  const handleQueryData = async (e) => {
    // if (!dateRange.startDate || !dateRange.endDate) {
    //   showModalMessage({
    //     type: "error",
    //     title: "錯誤！",
    //     content: "請選擇要查詢的日期區間",
    //   });
    // }

    if (isPromoterMode) {
      if (promoterId == "" || !promoterId) {
        return showModalMessage({
          type: "error",
          title: "錯誤！",
          content: "請輸入正確的推廣者ID",
        });
      }
    }

    setLoading(true);

    const response = await UserService.getPromterData(
      userToken,
      isPromoterMode ? promoterId : "",
      "2025-09-01",
      "2025-11-30",
      isPromoterMode ? "1" : "0"
    );
    setLoading(false);

    if (response.status == 200 && response.data.data) {
      if (response.data.data.resultCode == -1) {
        showModalMessage({
          type: "error",
          title: "錯誤！",
          content: "推廣數據分析有誤！查無指定推廣者！",
        });
      }

      if (response.data.data.resultCode == 1) {
        const result = response.data.data.result;
        setResult(result);
      }
    } else {
      showModalMessage({
        type: "error",
        title: "錯誤！",
        content: "推廣數據分析有誤！請聯絡官方人員！",
      });
    }
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

      {/* <div className="admin-header">
        <p>😀 Kevin 您好！</p>
      </div> */}

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

          {isPromoterMode && result && (
            <div className="promoter-info">
              <div className="item-info">
                <i class="bi bi-person-badge"></i>
                <p>用戶ID：{result.promoterID} /</p>
              </div>

              <div className="item-info">
                <i class="bi bi-qr-code-scan"></i>
                <p>推廣碼：{result.promotionCode}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard">
        <div className="simple-board">
          <div className="simple-data">
            <p className="title">推廣兌換數</p>
            <div className="div-line"></div>
            <p className="data">{result ? result.referalCounts : 0}</p>
          </div>
          <div className="h-space"></div>
          <div className="simple-data">
            <p className="title">推廣訂閱數</p>
            <div className="div-line"></div>
            <p className="data">{result ? result.referalSubCounts : 0}</p>
          </div>
          <div className="h-space"></div>
          <div className="simple-data">
            <p className="title">訂閱轉化率</p>
            <div className="div-line"></div>
            <p className="data">{result ? result.referalSubRate : 0} %</p>
          </div>
          <div className="h-space"></div>
          <div className="simple-data">
            <p className="title">預估總收益</p>
            <div className="div-line"></div>
            <p className="data">$ {result ? result.totalIncome : 0}</p>
          </div>
          <div className="h-space"></div>
          <div className="simple-data">
            <p className="title">聯盟分潤</p>
            <div className="div-line"></div>
            <p className="data">$ {result ? result.shareIncome : 0}</p>
          </div>
          <div className="h-space"></div>
          <div className="simple-data">
            <p className="title">回饋級距</p>
            <div className="div-line"></div>
            <p className="data">{result ? result.shareRate : 2} %</p>
          </div>
        </div>

        <div className="v-space"></div>

        <div className="complex-board">
          <div className="complex-chart">
            {result && (
              <div className="promo-chart">
                <p>推廣訂閱轉化率 : {result.referalSubRate} %</p>
                <div className="chart">
                  <PromoSubscribeBarChart
                    referalCounts={result.referalCounts}
                    referalSubCounts={result.referalSubCounts}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="h-space"></div>
          <div className="complex-chart">
            {result && (
              <div className="promo-chart">
                <p>用戶訂閱項目分佈</p>
                <div className="chart">
                  {" "}
                  <ProductPieChart
                    monthlyCounts={result.monthlyCounts}
                    quarterlyCounts={result.quarterlyCounts}
                    annualCounts={result.annualCounts}
                    left={80}
                    position={"right"}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="v-space"></div>

        <div className="complex-board">
          <div className="complex-chart">
            {result && (
              <div className="promo-chart">
                <p>兌換數性別比例</p>
                <div className="chart">
                  <PromoGenderPieChart
                    maleCount={result.referalGenderAgeArea.genderArea.male}
                    femaleCount={result.referalGenderAgeArea.genderArea.female}
                    specialCount={
                      result.referalGenderAgeArea.genderArea.special
                    }
                    left={80}
                    position={"right"}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="h-space"></div>
          <div className="complex-chart">
            {result && (
              <div className="promo-chart">
                <p>訂閱數性別比例</p>
                <div className="chart">
                  <PromoGenderPieChart
                    maleCount={result.subGenderAgeArea.genderArea.male}
                    femaleCount={result.subGenderAgeArea.genderArea.female}
                    specialCount={result.subGenderAgeArea.genderArea.special}
                    left={80}
                    position={"right"}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="v-space"></div>

        <div className="complex-board">
          <div className="complex-chart">
            {result && (
              <div className="promo-chart">
                <p>兌換數年齡Ｘ性別分佈</p>
                <div className="chart">
                  {" "}
                  <PromoAgeChart
                    labels={result.referalGenderAgeArea.ageLabels}
                    maleData={result.referalGenderAgeArea.maleData}
                    femaleData={result.referalGenderAgeArea.femaleData}
                    specialData={result.referalGenderAgeArea.specialData}
                    left={0}
                    position={"bottom"}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="h-space"></div>
          <div className="complex-chart">
            {result && (
              <div className="promo-chart">
                <p>訂閱數年齡Ｘ性別分佈</p>
                <div className="chart">
                  <PromoAgeChart
                    labels={result.subGenderAgeArea.ageLabels}
                    maleData={result.subGenderAgeArea.maleData}
                    femaleData={result.subGenderAgeArea.femaleData}
                    specialData={result.subGenderAgeArea.specialData}
                    left={0}
                    position={"bottom"}
                  />
                </div>
              </div>
            )}
          </div>
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
