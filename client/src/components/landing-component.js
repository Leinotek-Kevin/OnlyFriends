import React from "react";
import "../styles/landing.css";
import background from "../images/bg-onlyfriends.png";
import displayTitle from "../images/bg-display-title.png";
import displayRule from "../images/bg-display-rule.png";
import display1 from "../images/bg-display-1.png";
import display2 from "../images/bg-display-2.png";
import display3 from "../images/bg-display-3.png";
import appLogo from "../images/bg-logo.png";
import iOSButton from "../images/ic-iOS-btn.png";
import googleButton from "../images/ic-google-btn.png";

const LandingComponent = () => {
  return (
    <div className="landing">
      <img src={background} alt="背景" className="background" />
      {/* 標題*/}
      <header>
        <div className="app-logo">
          <img src={appLogo} alt="Logo" />
        </div>

        <div className="title">
          <p className="white-line" />
          <p className="main-slogan">恰好今天遇見你</p>
          <p className="sub-slogan">放慢腳步 專注於眼前的他</p>
          <p className="white-line" />
        </div>
      </header>

      {/* 主內容*/}
      <main>
        <div className="display">
          <img src={displayTitle} alt="Logo" />
        </div>

        <p className="download-hint">馬上下載</p>

        <div class="store-btn">
          <a
            href="https://apps.apple.com/tw/app/%E6%9B%96%E6%98%A7%E5%91%8A%E8%A7%A3%E5%AE%A4-%E4%BD%A0%E7%9A%84%E9%9A%A8%E8%BA%AB%E6%88%80%E6%84%9B%E5%B0%8E%E5%B8%AB-%E9%96%8B%E5%95%9F%E6%88%80%E6%84%9B%E5%8A%A0%E9%80%9F%E6%A8%A1%E5%BC%8F/id6578435303"
            target="_blank"
          >
            <img src={iOSButton} alt="apple download" />
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=com.anonymous.ipush"
            target="_blank"
          >
            <img src={googleButton} alt="google download" />
          </a>
        </div>

        <p className="keep-look">▼</p>
        <p className="keep-look">▼</p>
        <p className="keep-look">▼</p>

        <p className="rule-title">享受全新體驗</p>

        <div className="display">
          <img src={displayRule} alt="OnlyFirends Rule" />
        </div>
      </main>

      {/* 介紹內容*/}
      <main className="sub-main">
        <div>
          <p className="intro-title">限定時間內認識彼此</p>
          <p className="intro-sub-title">-尋找合拍的遊戲夥伴-</p>

          <div className="display">
            <img src={display1} alt="OnlyFirends Rule 1" />
          </div>
        </div>
        <p className="space"></p>
        {/* <div>
          <p className="intro-title">告別看臉交友時代</p>
          <p className="intro-sub-title">-聊天解鎖照片 好感度機制-</p>

          <div className="display">
            <img src={display2} alt="OnlyFirends Rule 2" />
          </div>
        </div>
        <p className="space"></p> */}
        <div>
          <p className="intro-title">還能擁抱你的心情</p>
          <p className="intro-sub-title">-分享心情的匿名配對機會-</p>

          <div className="display">
            <img src={display3} alt="OnlyFirends Rule 3" />
          </div>
          <p className="space"></p>
        </div>
      </main>

      <div className="footer-logo">
        <img src={appLogo} alt="Logo" />
      </div>

      {/* 頁尾*/}
      <footer>
        <div className="privacy">
          <a
            href="https://hackmd.io/@6haHDxSMQPeSHmmc7TDlUA/r1IUytRIJe"
            target="_blank"
          >
            隱私權政策
          </a>
          |
          <a
            href="https://hackmd.io/hcpUXL1kRkqXkMEXfN94eQ?view"
            target="_blank"
          >
            使用者條款
          </a>
          |
          <a href="https://lin.ee/cUD3cfH" target="_blank">
            聯絡我們
          </a>
          <p className="copyright">
            Copyright © 2025 OnlyFriends by Leinotek Co,.Ltd.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingComponent;
