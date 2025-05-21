import React, { useState } from "react";
import "../../styles/drink.css";
import enterBackground from "../../images/drinks/enter-background.png";
import introBackground from "../../images/drinks/intro-background.png";
import { questions, drinks } from "../../constants/drink-enum";

const DrinkTestComponent = () => {
  //state : enter , intro , quiz , result
  const [step, setStep] = useState("enter");
  const [result, setResult] = useState("");

  //目前作答到第幾題
  const [current, setCurrent] = useState(0);

  //有10題,預設填入 -1 表示還沒有作答
  const [answers, setAnswers] = useState(Array(questions.length).fill(-1));

  const handleOptionClick = (index) => {
    const newAnswers = [...answers];
    newAnswers[current] = index;
    setAnswers(newAnswers);

    // 儲存到 localStorage
    localStorage.setItem("quizAnswers", JSON.stringify(newAnswers));

    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      setResult(getTopTrait(calculatePersonalityScores(newAnswers)).trait);
      setStep("result");
    }
  };

  const handleShare = () => {
    const shareText = `我剛做了人格測驗，結果是：紅酒！#飲料人際測驗`;
    const url = window.location.href;
    navigator.share?.({
      title: "蛋糕人格測驗",
      text: shareText,
      url,
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

  return (
    <div>
      {step === "enter" && (
        <div className="enter-page">
          <main>
            <img src={enterBackground} alt="背景" className="background" />

            <div className="entrance">
              <p className="title">你是什麼飲料?</p>
              <p className="sub-title">3 分鐘揭曉你與朋友的 10 種人際關係</p>

              <button
                type="button"
                onClick={() => {
                  setStep("intro");
                }}
              >
                立即測驗
              </button>
            </div>
          </main>

          <footer className="copyright">
            <p>Copyright © 2025 OnlyFriends by Leinotek Co,.Ltd.</p>
          </footer>
        </div>
      )}

      {step === "intro" && (
        <div className="intro-page">
          <img src={introBackground} alt="背景" className="background" />
          <main>
            <p>
              你和幾位朋友走進一座繽紛又陌生的遊樂園，每個選擇都藏著你的交友風格與挑戰。請跟著故事，選出你最真實的反應吧！
            </p>

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
              {current > 0 ? (
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
              )}
              <div className="quizs">
                {questions[current].options.map((opt, idx) => (
                  <button
                    key={idx}
                    variant={answers[current] === idx ? "default" : "outline"}
                    onClick={() => handleOptionClick(idx)}
                    className="btn"
                  >
                    {opt.quiz}
                  </button>
                ))}
              </div>

              {current < questions.length - 1 && answers[current] !== -1 ? (
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
              )}
            </div>
          </main>
        </div>
      )}

      {step === "result" && (
        <div className="result-page">
          <main>
            <div>
              <img
                src={`/images/drinks/${result}.png`}
                className="result"
                alt={
                  drinks.find((drink) => drink.drinkSign === result)?.drinkName
                }
              />
            </div>

            <button type="button" onClick={handleShare}>
              分享結果
            </button>

            <a
              href={`/images/drinks/${result}.png`}
              download={`${
                drinks.find((drink) => drink.drinkSign === result)?.drinkName
              }-飲料測驗結果.png`}
            >
              <button type="button">下載圖片</button>
            </a>

            <button type="button" onClick={resetQuiz}>
              重新測驗
            </button>
          </main>

          <footer className="copyright">
            <p>Copyright © 2025 OnlyFriends by Leinotek Co,.Ltd.</p>
          </footer>
        </div>
      )}
    </div>
  );
};

export default DrinkTestComponent;
