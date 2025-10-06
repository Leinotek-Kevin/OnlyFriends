import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/parther-dashboard.css";
import UserService from "../../services/user-service";
import AuthService from "../../services/auth-service";
import FullScreenLoading from "../widget/full-screen-loading";
import { showModalMessage } from "../widget/modeal-msg-dialog";
import DateRangeSelector from "../../components/widget/range-picker";
import { Checkbox } from "antd";
import PromoSubscribeBarChart from "../chart/promo-sub-barchart";
import ProductPieChart from "../chart/product-piechart";
import PromoGenderPieChart from "../chart/promo-gender-piechart";
import PromoAgeChart from "../chart/promo-age-chart";

import logo from "../../images/ic-logo-black.png";

const PartherDataComponent = ({ userToken, setUserToken }) => {
  const navigate = useNavigate();
  const [toastMsg, setToastMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const { promoterId, userPhoto } = location.state || {};
  const [isPromoterMode, setIsPromoterMode] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const [result, setResult] = useState(null);

  async function getPromterData() {
    try {
      setLoading(true);
      const response = await UserService.getPromterData(
        userToken,
        promoterId,
        "2025-09-01",
        "2025-12-31",
        "1"
      );
      if (response.status == 200 && response.data.data) {
        if (response.data.data.resultCode == -1) {
          showModalMessage({
            type: "error",
            title: "錯誤！",
            content: "推廣數據分析有誤！查無指定推廣者！",
          });
        }

        if (response.data.data.resultCode == 1) {
          window.scrollTo(0, 0);
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

      setLoading(false);
    } catch (error) {
      console.error("API呼叫失敗", error);
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      getPromterData();
    }, 300); // 延遲300毫秒

    return () => clearTimeout(timer); // 組件卸載時清除定時器，避免內存洩漏
  }, [userToken, isPromoterMode, promoterId]);

  // toast 消失控制
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(""), 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  useEffect(() => {
    if (!userToken || !promoterId) {
      navigate("/parther-admin");
    }
  }, [userToken]);

  function copyPromotionCode() {
    if (result?.promotionCode) {
      navigator.clipboard
        .writeText(result.promotionCode)
        .then(() => {
          setToastMsg("推廣碼已複製！");
        })
        .catch((err) => {
          setToastMsg("複製失敗，請手動複製");
        });
    }
  }

  function copyPromotionLink() {
    if (result?.promotionCode) {
      navigator.clipboard
        .writeText("https://onlyfriends.onelink.me/vWTM/e1mlodow")
        .then(() => {
          setToastMsg("分享連結已複製！");
        })
        .catch((err) => {
          setToastMsg("複製失敗，請手動複製");
        });
    }
  }

  const handleLogout = (e) => {
    e.preventDefault();
    const confirmed = window.confirm("你確定要登出嗎？");
    if (confirmed) {
      AuthService.logout();
      navigate("/parther-admin");
    }
  };

  return (
    <div className="parther-dashboard">
      <FullScreenLoading loading={loading} />

      <div className="admin-header">
        <i onClick={handleLogout} class="bi bi-box-arrow-left logout"></i>
        <img src={logo} alt="logo" className="logo" />
        <i onClick={getPromterData} class="bi bi-arrow-clockwise refresh"></i>
      </div>

      <div className="top-board">
        <div className="left">
          <div className="item-info">
            <i class="bi bi-qr-code-scan"></i>
            <p>
              推廣碼：{result && <strong>{result.promotionCode}</strong>}
              <i onClick={copyPromotionCode} class="bi bi-clipboard"></i>
            </p>
          </div>
          <div className="item-info">
            <i class="bi bi-calendar-week"></i>

            <p>
              活動期間： <br></br> <strong>2025/09/01 ~ 2025/11/30</strong>
            </p>
          </div>
          <div className="item-info">
            <i class="bi bi-share-fill"></i>
            <p>
              分享連結： <br></br>{" "}
              <strong>https://onlyfriends.onelink.me/vWTM/e1mlodow</strong>
              <i onClick={copyPromotionLink} class="bi bi-clipboard"></i>
            </p>
          </div>
        </div>
        <div className="v-line"></div>
        <div className="right">
          <img className="photo" src={userPhoto} alt="用戶大頭貼" />
          <p>ID：{result && result.promoterID}</p>
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
        </div>
        <div className="v-space"></div>
        <div className="simple-board">
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
        <div className="v-space"></div>

        <div className="complex-board">
          {/* 推廣訂閱轉化率 */}
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
          {/* 用戶訂閱項目分佈 */}
          <div className="complex-chart">
            {result && (
              <div className="promo-chart">
                <p>用戶訂閱項目分佈</p>
                <div className="chart">
                  <ProductPieChart
                    monthlyCounts={result.monthlyCounts}
                    quarterlyCounts={result.quarterlyCounts}
                    annualCounts={result.annualCounts}
                    left={0}
                    position={"bottom"}
                  />
                </div>
              </div>
            )}
          </div>
          {/* 兌換數性別比例 */}
          <div className="complex-chart">
            {result && (
              <div className="promo-chart">
                <p>兌換數性別比例</p>
                <div className="chart">
                  {" "}
                  <PromoGenderPieChart
                    maleCount={result.referalGenderAgeArea.genderArea.male}
                    femaleCount={result.referalGenderAgeArea.genderArea.female}
                    specialCount={
                      result.referalGenderAgeArea.genderArea.special
                    }
                    left={0}
                    position={"bottom"}
                  />
                </div>
              </div>
            )}
          </div>
          {/* 訂閱數性別比例 */}
          <div className="complex-chart">
            {result && (
              <div className="promo-chart">
                <p>訂閱數性別比例</p>
                <div className="chart">
                  <PromoGenderPieChart
                    maleCount={result.subGenderAgeArea.genderArea.male}
                    femaleCount={result.subGenderAgeArea.genderArea.female}
                    specialCount={result.subGenderAgeArea.genderArea.special}
                    left={0}
                    position={"bottom"}
                  />
                </div>
              </div>
            )}
          </div>
          {/* 兌換數年齡Ｘ性別分佈 */}
          <div className="complex-chart">
            {result && (
              <div className="promo-chart">
                <p>兌換數年齡Ｘ性別分佈</p>
                <div className="chart">
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
          {/* 訂閱數年齡Ｘ性別分佈 */}
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
      {/* Toast 訊息 */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "30px", // 距離螢幕底部 30px
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0,0,0,0.75)",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            fontSize: "0.9rem",
            zIndex: 9999,
            pointerEvents: "none",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
};

export default PartherDataComponent;
