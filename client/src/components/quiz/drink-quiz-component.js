import React, { useState, useEffect } from "react";
import "../../styles/drink.css";
import desktopEnterBg from "../../images/drinks/bg-drink-quiz-enter.jpg";
import mobileEnterBg from "../../images/drinks/bg-drink-quiz-m-enter.jpg";
import introBackground from "../../images/drinks/bg-drink-quiz-intro.jpg";
import ofsLogo from "../../images/ic-logo-fill.png";
import ofsWhiteLogo from "../../images/bg-logo.png";
import ofsBackground from "../../images/bg-onlyfriends.png";
import displayTitle from "../../images/bg-display-title.png";
import iOSButton from "../../images/ic-iOS-btn.png";
import googleButton from "../../images/ic-google-btn.png";
import { questions, drinks } from "../../constants/drink-enum";
import { Helmet } from "react-helmet";
import Carousel from "../quiz/drink-carousel";

const DrinkTestComponent = () => {
  //state : enter , intro , quiz , result
  const [step, setStep] = useState("enter");
  const [result, setResult] = useState("");

  //目前作答到第幾題
  const [current, setCurrent] = useState(0);

  //有10題,預設填入 -1 表示還沒有作答
  const [answers, setAnswers] = useState(Array(questions.length).fill(-1));

  useEffect(() => {
    if (step === "enter") {
      window.scrollTo(0, 0);
    }
  }, [step]);

  const handleOptionClick = (index) => {
    if (answers[current] !== -1) return; // 已作答則不執行
    setClickedIndex(index);

    const newAnswers = [...answers];
    newAnswers[current] = index;
    setAnswers(newAnswers);

    // 儲存到 localStorage
    localStorage.setItem("quizAnswers", JSON.stringify(newAnswers));

    setTimeout(() => {
      setClickedIndex(null);
      if (current < questions.length - 1) {
        setCurrent(current + 1);
      } else {
        setResult(getTopTrait(calculatePersonalityScores(newAnswers)).trait);
        setStep("result");
      }
    }, 150);
  };

  const handleShare = () => {
    //const shareText = "測你交友的最大阻礙 - Only Friends";
    const shareUrl = "https://dev.ofs.leinotek.com/drink-share.html"; // 改成你實際部署網址！

    navigator.share?.({
      title: "你是什麼飲料呢？",
      //text: shareText,
      url: shareUrl,
    });
  };

  function calculatePersonalityScores(srcAnswers) {
    const userAnswers = srcAnswers.map((answer, index) => {
      return questions[index].options[answer].value;
    });

    const scoreMap = {}; // e.g., { A: 1.8, B: 0.5, C: 1.2, ... }

    for (const expression of userAnswers) {
      // 將 "A + K*0.3" 拆成 ["A", "K*0.3"]
      const parts = expression.split("+").map((p) => p.trim());

      for (const part of parts) {
        if (/^[A-K]$/.test(part)) {
          // 純字母，表示加1分
          scoreMap[part] = (scoreMap[part] || 0) + 1;
        } else {
          const match = part.match(/^([A-K])\*(\d+(\.\d+)?)$/);
          if (match) {
            const trait = match[1];
            const value = parseFloat(match[2]);
            const newScore = (scoreMap[trait] || 0) + value;
            scoreMap[trait] = Math.round(newScore * 10) / 10;
          } else {
            console.warn(`無法解析項目：${part}`);
          }
        }
      }
    }
    localStorage.setItem("caluAnswer", JSON.stringify(scoreMap));
    return scoreMap;
  }

  function getTopTrait(scoreMap) {
    const entries = Object.entries(scoreMap);
    if (entries.length === 0) return null;

    // 找出最高分
    const maxScore = Math.max(...entries.map(([_, score]) => score));

    // 找出所有達到最高分的 traits
    const topTraits = entries.filter(([_, score]) => score === maxScore);

    // 隨機選一個
    const [trait, score] =
      topTraits[Math.floor(Math.random() * topTraits.length)];

    localStorage.setItem("result", trait);

    return { trait, score };
  }

  const resetQuiz = () => {
    setStep("enter"); // 回到起始頁
    setResult(""); // 清空結果
    setCurrent(0); // 回到第一題
    setAnswers(Array(questions.length).fill(-1)); // 重置答案
    localStorage.removeItem("quizAnswers"); // 清除 localStorage
    localStorage.removeItem("caluAnswer");
    localStorage.removeItem("result");
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 530);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 530);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const enterBackground = isMobile ? mobileEnterBg : desktopEnterBg;

  const [clickedIndex, setClickedIndex] = useState(null);

  return (
    <div className="drink-quiz">
      {step === "enter" && (
        <div className="enter-page">
          <header>
            <img src={enterBackground} alt="背景" className="background" />

            <p className="title">測你交友的最大阻礙</p>

            <button
              type="button"
              onClick={() => {
                setStep("intro");
              }}
            >
              開始測驗
            </button>
          </header>

          <main>
            <p className="carousel-title">交友總覺得不順利嗎？</p>
            <p className="carousel-subtitle">或許你的特質是...</p>

            <Carousel className="carousel" />

            <button
              type="button"
              onClick={() => {
                setStep("intro");
              }}
            >
              找出交友阻礙
            </button>

            <p className="keep-look">▼</p>
            <p className="keep-look">▼</p>
            <p className="keep-look">▼</p>

            <p className="question-title">一般的交友軟體不適合你？</p>
            <p className="question-subtitle">也許你該試試...</p>

            <img src={ofsLogo} alt="only friends logo" className="app-logo" />

            <p className="ofs-intro-title">Only Friends</p>
            <p className="ofs-intro-subtitle">
              24小時限時交友機制
              <br />
              擺脫交友疲乏，告別無止盡滑卡！
            </p>

            <div className="ofs-area">
              <img src={ofsBackground} alt="背景" className="background" />

              <div className="slogan">
                <p className="white-line" />
                <p className="main-slogan">恰好今天遇見你</p>
                <p className="sub-slogan">放慢腳步 專注於眼前的他</p>
                <p className="white-line" />
              </div>

              <div className="display">
                <img src={displayTitle} alt="Display Logo" />
              </div>

              <p className="download-hint">馬上下載</p>

              <div className="download-btn">
                <div className="btn">
                  <a
                    href="https://apps.apple.com/tw/app/only-friends-%E6%81%B0%E5%A5%BD%E4%BB%8A%E5%A4%A9%E9%81%87%E8%A6%8B%E4%BD%A0/id6738079426"
                    target="_blank"
                  >
                    <img src={iOSButton} alt="apple download" />
                  </a>
                </div>

                <div className="space"></div>

                <div className="btn">
                  <a
                    href="https://play.google.com/store/apps/details?id=com.anonymous.onlyfriends"
                    target="_blank"
                  >
                    <img src={googleButton} alt="google download" />
                  </a>
                </div>
              </div>

              <div className="white-logo">
                <img
                  src={ofsWhiteLogo}
                  alt="only friends logo"
                  className="app-white-logo"
                />
              </div>

              <div className="footer">
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
            </div>
          </main>
        </div>
      )}

      {step === "intro" && (
        <div className="intro-page">
          <img src={introBackground} alt="背景" className="background" />
          <main>
            <p>
              你和幾位朋友走進一座繽紛又陌生的遊樂園，每個選擇都藏著你的交友風格與挑戰。請跟著故事，選出你最真實的反應吧！
            </p>

            {/* <p>請跟著故事，選出你最真實的反應吧！</p> */}

            <button
              type="button"
              onClick={() => {
                setStep("quiz");
              }}
            >
              開始
            </button>
          </main>
        </div>
      )}

      {step === "quiz" && (
        <div className="quiz-page">
          <img src={introBackground} alt="背景" className="background" />

          <div className="progress-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${(current / (questions.length - 1)) * 100}%` }}
            >
              <div className="progress-indicator" />
            </div>
          </div>

          <main>
            <p>{questions[current].question}</p>

            <div className="quiz-area">
              {/* {current > 0 ? (
                <button
                  className="opt-btn"
                  onClick={() => setCurrent(current - 1)}
                >
                  <i class="bi bi-caret-left-fill fs-3"></i>
                </button>
              ) : (
                <button className="opt-btn" style={{ visibility: "hidden" }}>
                  <i className="bi bi-caret-left-fill fs-3"></i>
                </button>
              )} */}
              <div className="quizs">
                {questions[current].options.map((opt, idx) => (
                  <button
                    key={idx}
                    variant={answers[current] === idx ? "default" : "outline"}
                    onClick={() => handleOptionClick(idx)}
                    className={`btn ${clickedIndex === idx ? "clicked" : ""}`}
                  >
                    {opt.quiz}
                  </button>
                ))}
              </div>

              {/* {current < questions.length - 1 && answers[current] !== -1 ? (
                <button
                  className="opt-btn"
                  onClick={() => setCurrent(current + 1)}
                >
                  <i class="bi bi-caret-right-fill fs-3"></i>
                </button>
              ) : (
                <button className="opt-btn" style={{ visibility: "hidden" }}>
                  <i className="bi bi-caret-right-fill fs-3"></i>
                </button>
              )} */}
            </div>
          </main>
        </div>
      )}

      {step === "result" && (
        <div className="result-page">
          <p className="title">你的測驗結果是...</p>

          <a
            className="download"
            href={`/images/drinks/${result}.jpg`}
            download={`${
              drinks.find((drink) => drink.drinkSign === result)?.drinkName
            }-你是什麼飲料測驗結果.jpg`}
          >
            <p>(點擊下載圖片)</p>
          </a>

          <div className="drink-result">
            <img
              src={`/images/drinks/${result}.jpg`}
              className="result"
              alt={
                drinks.find((drink) => drink.drinkSign === result)?.drinkName
              }
            />
          </div>

          <button type="button" onClick={handleShare} className="share-quiz">
            分享測驗連結
          </button>

          <button type="button" onClick={resetQuiz} className="reset-quiz">
            重測一次
          </button>

          <p className="keep-look">▼</p>
          <p className="keep-look">▼</p>
          <p className="keep-look">▼</p>

          <p className="question-title">一般的交友軟體不適合你？</p>
          <p className="question-subtitle">也許你該試試...</p>

          <img src={ofsLogo} alt="only friends logo" className="app-logo" />

          <p className="ofs-intro-title">Only Friends</p>
          <p className="ofs-intro-subtitle">
            24小時限時交友機制
            <br />
            擺脫交友疲乏，告別無止盡滑卡！
          </p>
          <div className="ofs-area">
            <img src={ofsBackground} alt="背景" className="background" />

            <div className="slogan">
              <p className="white-line" />
              <p className="main-slogan">恰好今天遇見你</p>
              <p className="sub-slogan">放慢腳步 專注於眼前的他</p>
              <p className="white-line" />
            </div>

            <div className="display">
              <img src={displayTitle} alt="Display Logo" />
            </div>

            <p className="download-hint">馬上下載</p>

            {/* 下載按鈕 */}
            <div className="download-btn">
              <div className="btn">
                <a
                  href="https://apps.apple.com/tw/app/only-friends-%E6%81%B0%E5%A5%BD%E4%BB%8A%E5%A4%A9%E9%81%87%E8%A6%8B%E4%BD%A0/id6738079426"
                  target="_blank"
                >
                  <img src={iOSButton} alt="apple download" />
                </a>
              </div>

              <div className="space"></div>

              <div className="btn">
                <a
                  href="https://play.google.com/store/apps/details?id=com.anonymous.onlyfriends"
                  target="_blank"
                >
                  <img src={googleButton} alt="google download" />
                </a>
              </div>
            </div>

            <div className="white-logo">
              <img
                src={ofsWhiteLogo}
                alt="only friends logo"
                className="app-white-logo"
              />
            </div>

            <div className="footer">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default DrinkTestComponent;
