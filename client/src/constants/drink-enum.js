export const questions = Object.freeze([
  {
    moment: "入園時",
    question: "你和幾位朋友走進遊樂園，第一眼你注意到的是什麼？",
    options: [
      {
        quiz: "A. 色彩繽紛的裝飾和歡樂氣氛",
        value: "A + K*0.3",
      },
      {
        quiz: "B. 各種適合拍照的打卡點！",
        value: "I + C*0.3",
      },
      {
        quiz: "C. 想直衝遊樂設施，超期待！",
        value: "F + B*0.2",
      },
      {
        quiz: "D. 園內的動線和設施分布",
        value: "G + D*0.4",
      },
      {
        quiz: "E. 人群中的自由與隨興氣息",
        value: "C + I*0.3",
      },
    ],
  },
  {
    moment: "排隊挑戰",
    question: "第一個熱門設施大排長龍，你會？",
    options: [
      {
        quiz: "A. 想找個更安靜不用排隊的項目",
        value: "D + J*0.3",
      },
      {
        quiz: "B. 提議去玩冷門，但刺激的設施",
        value: "H + A*0.3",
      },
      {
        quiz: "C. 開始跟朋友玩小遊戲打發時間",
        value: "C + I*0.3",
      },
      {
        quiz: "D. 默默排隊，但內心有點煩躁",
        value: "K + G*0.2",
      },
    ],
  },
  {
    moment: "分頭行動",
    question: "朋友們提議分組行動再會合，你怎麼看？",
    options: [
      {
        quiz: "A. 願意配合，自己也想放空一下",
        value: "J + D*0.3",
      },
      {
        quiz: "B. 覺得大家分開不太好，會失去群體感",
        value: "A + K*0.2",
      },
      ,
      {
        quiz: "C. 願意配合，重點是大家開心",
        value: "G + B*0.3",
      },
      {
        quiz: "D. 難得出來玩，一起比較有趣！",
        value: "F + C*0.2",
      },
      {
        quiz: "E. 既期待獨處時光，也想和大家分享",
        value: "I + C*0.3",
      },
    ],
  },
  {
    moment: "朋友情緒低落",
    question: "有人突然心情低落、不太說話，你？",
    options: [
      {
        quiz: "A. 主動陪伴，並想辦法讓對方笑",
        value: "B + F*0.3",
      },
      {
        quiz: "B. 默默靠近，並說句關心的話",
        value: "K + A*0.2",
      },
      {
        quiz: "C. 給對方空間，等他準備好再說",
        value: "J + D*0.3",
      },
      {
        quiz: "D. 裝作沒發現，怕越幫越忙",
        value: "H + G*0.2",
      },
    ],
  },
  {
    moment: "團體拍照",
    question: "大家聚在一起拍照，你的第一反應是？",
    options: [
      {
        quiz: "A. 搶當主角，擺個浮誇Pose！",
        value: "C + B*0.3",
      },
      {
        quiz: "B. 自告奮勇拿相機當攝影師！",
        value: "I + F*0.2",
      },
      {
        quiz: "C. 站邊邊就好，笑一下意思到",
        value: "A + K*0.3",
      },
      {
        quiz: "D. 拍完默默看自己拍得好不好",
        value: "D + J*0.3",
      },
    ],
  },
  {
    moment: "朋友遲到",
    question: "午餐時發現有朋友還沒來，你會？",
    options: [
      {
        quiz: "A. 主動傳訊關心對方狀況",
        value: "G + B*0.2",
      },
      {
        quiz: "B. 開始擔心是不是自己說錯話",
        value: "K + A*0.2",
      },
      {
        quiz: "C. 想他可能有其他安排吧",
        value: "F + D*0.2",
      },
      {
        quiz: "D. 直接提出來讓大家知道",
        value: "H + J*0.3",
      },
      {
        quiz: "E. 繼續享受當下，相信他會處理好",
        value: "C + B*0.3",
      },
    ],
  },
  {
    moment: "決定路線",
    question: "接下來要去哪裡玩，大夥有點分歧，你？",
    options: [
      {
        quiz: "A. 默默觀察大家意見後再發言",
        value: "J + D*0.3",
      },
      {
        quiz: "B. 提出個效率最高的方案",
        value: "D + G*0.3",
      },
      {
        quiz: "C. 建議大家投票決定最公平！",
        value: "I + B*0.3",
      },
      {
        quiz: "D. 興奮提出新選項，吸引注意",
        value: "C + F*0.3",
      },
    ],
  },
  {
    moment: "大家想法不同",
    question: "有些人想玩雲霄飛車，有些人怕高，你？",
    options: [
      {
        quiz: "A. 提議分批進行，兩邊都照顧到",
        value: "A + G*0.3",
      },
      {
        quiz: "B. 順著多數人的意見走",
        value: "F + B*0.2",
      },
      {
        quiz: "C. 努力協調讓兩邊都舒服",
        value: "G + D*0.2",
      },
      {
        quiz: "D. 直接建議其中一方妥協",
        value: "H + A*0.3",
      },
      {
        quiz: "E. 用幽默化解尷尬氣氛",
        value: "B + C*0.3",
      },
    ],
  },
  {
    moment: "悄悄話場景",
    question: "你發現有兩位朋友在旁邊講悄悄話，你會？",
    options: [
      {
        quiz: "A. 心裡不太舒服，但不表現出來",
        value: "D + J*0.3",
      },
      {
        quiz: "B. 表面裝沒事，但開始觀察氣氛",
        value: "C + A*0.2",
      },
      {
        quiz: "C. 擔心自己是不是被排擠了",
        value: "K + G*0.2",
      },
      {
        quiz: "D. 開玩笑說「你們在講我壞話嗎？」",
        value: "H + F*0.2",
      },
    ],
  },
  {
    moment: "午餐時間",
    question: "你準備選餐點時會：",
    options: [
      {
        quiz: "A. 先問大家想吃什麼再決定",
        value: "B + C*0.3",
      },
      {
        quiz: "B. 看到新推出的就想嘗試",
        value: "F + I*0.3",
      },
      {
        quiz: "C. 快速決定自己最熟悉的選項",
        value: "D + J*0.3",
      },
      {
        quiz: "D. 考慮大家預算和口味偏好",
        value: "G + A*0.3",
      },
      {
        quiz: "E. 跟著最多人選的一起點",
        value: "J + K*0.3",
      },
    ],
  },
  {
    moment: "爭執發生",
    question: "兩位朋友因小事爭執，你會：",
    options: [
      {
        quiz: "A. 溫和地安撫氣氛，請大家冷靜",
        value: "K + G*0.2 + J*0.1",
      },
      {
        quiz: "B. 假裝沒聽到，不想被捲入",
        value: "H + D*0.2",
      },
      {
        quiz: "C. 像和事佬努力進行調停",
        value: "A + J*0.2 + J*0.1",
      },
      {
        quiz: "D. 巧妙轉移話題化解衝突",
        value: "J + G*0.2 + A*0.1",
      },
      {
        quiz: "E. 說點輕鬆話緩和氣氛",
        value: "I + C*0.2 + F*0.1",
      },
    ],
  },
  {
    moment: "玩笑失控",
    question: "有人開玩笑過頭，讓另一人不開心，你？",
    options: [
      {
        quiz: "A. 觀察誰情緒不對，私下關心",
        value: "D + H*0.2 + G*0.1",
      },
      {
        quiz: "B. 小聲提醒朋友要適可而止",
        value: "G + J*0.2 + D*0.1",
      },
      {
        quiz: "C. 轉移話題讓大家重新歡樂",
        value: "C + I*0.2 + F*0.1",
      },
      {
        quiz: "D. 覺得沒什麼，大家別太敏感",
        value: "F + C*0.2 + I*0.1",
      },
    ],
  },
  {
    moment: "陌生人搭話",
    question: "排隊時隔壁陌生人突然搭話，你會？",
    options: [
      {
        quiz: "A. 聊得很開心，還互加聯絡方式",
        value: "I + C*0.2 + F*0.1",
      },
      {
        quiz: "B. 愉快地閒聊幾句交流",
        value: "F + I*0.2 + C*0.1",
      },
      {
        quiz: "C. 禮貌回應，但保持距離",
        value: "A + J*0.2 + G*0.1",
      },
      {
        quiz: "D. 微笑後滑手機表示忙碌",
        value: "J + A*0.2 + G*0.1",
      },
    ],
  },
  {
    moment: "唱K提議",
    question: "朋友提議離開後去唱KTV，你會？",
    options: [
      {
        quiz: "A. 立刻興奮地表示贊成！",
        value: "C + I*0.3 + F*0.1",
      },
      {
        quiz: "B. 擔心時間太晚會影響他人",
        value: "K + A*0.2 + J*0.1",
      },
      {
        quiz: "C. 覺得不錯，但自己不想唱歌",
        value: "H + D*0.2 + G*0.1",
      },
      {
        quiz: "D. 願意陪去當聽眾和攝影師",
        value: "D + H*0.2 + G*0.1",
      },
    ],
  },
  {
    moment: "回顧旅程",
    question: "離開前大家在出口拍最後合照，你在想？",
    options: [
      {
        quiz: "A. 今天雖然有小波折，但整體很開心",
        value: "A + K*0.3 + G*0.1",
      },
      {
        quiz: "B. 我是不是又在過度迎合大家了？",
        value: "G + J*0.2 + D*0.1",
      },
      {
        quiz: "C. 希望我們以後還能常常一起出來",
        value: "B + I*0.2 + K*0.1",
      },
      {
        quiz: "D. 還好我今天表現得不會太突兀",
        value: "J + A*0.2 + G*0.1",
      },
      {
        quiz: "E. 等等要好好整理照片發到社群上",
        value: "C + I*0.2 + F*0.1",
      },
    ],
  },
]);

export const drinks = Object.freeze([
  {
    drinkSign: "A",
    drinkName: "紅酒",
  },
  {
    drinkSign: "B",
    drinkName: "珍奶",
  },
  {
    drinkSign: "C",
    drinkName: "氣泡水",
  },
  {
    drinkSign: "D",
    drinkName: "黑咖啡",
  },
  {
    drinkSign: "F",
    drinkName: "柳橙汁",
  },
  {
    drinkSign: "G",
    drinkName: "抹茶拿鐵",
  },
  {
    drinkSign: "H",
    drinkName: "威士忌",
  },
  {
    drinkSign: "I",
    drinkName: "奶昔",
  },
  {
    drinkSign: "J",
    drinkName: "綠茶",
  },
  {
    drinkSign: "K",
    drinkName: "熱可可",
  },
]);
