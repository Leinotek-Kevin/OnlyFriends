export const questions = Object.freeze([
  {
    moment: "入園時",
    question: "你和幾位朋友走進遊樂園，第一眼你注意到的是什麼？",
    options: [
      {
        quiz: "色彩繽紛的裝飾和歡樂氣氛",
        value: "A + K*0.3",
      },
      {
        quiz: "各種適合拍照的打卡點！",
        value: "I + C*0.3",
      },
      {
        quiz: "想直衝遊樂設施，超期待！",
        value: "F + B*0.2",
      },
      {
        quiz: "園內的動線和設施分布",
        value: "G + D*0.4",
      },
      {
        quiz: "人群中的自由與隨興氣息",
        value: "C + I*0.3",
      },
    ],
  },
  {
    moment: "排隊挑戰",
    question: "第一個熱門設施大排長龍，你會？",
    options: [
      {
        quiz: "想找個更安靜不用排隊的項目",
        value: "D + J*0.3",
      },
      {
        quiz: "提議去玩冷門，但刺激的設施",
        value: "H + A*0.3",
      },
      {
        quiz: "開始跟朋友玩小遊戲打發時間",
        value: "C + I*0.3",
      },
      {
        quiz: "默默排隊，但內心有點煩躁",
        value: "K + G*0.2",
      },
    ],
  },
  {
    moment: "分頭行動",
    question: "朋友們提議分組行動再會合，你怎麼看？",
    options: [
      {
        quiz: "願意配合，自己也想放空一下",
        value: "J + D*0.3",
      },
      {
        quiz: "覺得大家分開不太好，會失去群體感",
        value: "A + K*0.2",
      },
      ,
      {
        quiz: "願意配合，重點是大家開心",
        value: "G + B*0.3",
      },
      {
        quiz: "難得出來玩，一起比較有趣！",
        value: "F + C*0.2",
      },
      {
        quiz: "不太喜歡分開，想和更多人互動",
        value: "I + C*0.3",
      },
    ],
  },
  {
    moment: "朋友情緒低落",
    question: "有人突然心情低落、不太說話，你？",
    options: [
      {
        quiz: "主動陪伴，並想辦法讓對方笑",
        value: "B + F*0.3",
      },
      {
        quiz: "默默靠近，並說句關心的話",
        value: "K + A*0.2",
      },
      {
        quiz: "給對方空間，等他準備好再說",
        value: "J + D*0.3",
      },
      {
        quiz: "裝作沒發現，怕越幫越忙",
        value: "H + G*0.2",
      },
    ],
  },
  {
    moment: "團體拍照",
    question: "大家聚在一起拍照，你的第一反應是？",
    options: [
      {
        quiz: "搶當主角，擺個浮誇Pose！",
        value: "C + B*0.3",
      },
      {
        quiz: "自告奮勇拿自拍棒！",
        value: "I + F*0.2",
      },
      {
        quiz: "站邊邊就好，笑一下意思到",
        value: "A + K*0.3",
      },
      {
        quiz: "拍完默默看自己拍得好不好",
        value: "D + J*0.3",
      },
    ],
  },
  {
    moment: "朋友遲到",
    question: "午餐時發現有朋友還沒來，你會？",
    options: [
      {
        quiz: "傳訊問對方還好嗎？",
        value: "G + B*0.2",
      },
      {
        quiz: "開始焦慮是不是自己說錯話",
        value: "K + A*0.2",
      },
      {
        quiz: "覺得他可能自己有安排吧",
        value: "F + D*0.2",
      },
      {
        quiz: "說出來提醒大家他還沒來",
        value: "H + J*0.3",
      },
      {
        quiz: "不太在意，繼續享受自己的時光",
        value: "C + B*0.3",
      },
    ],
  },
  {
    moment: "決定路線",
    question: "接下來要去哪裡玩，大夥有點分歧，你？",
    options: [
      {
        quiz: "默默觀察大家意見後再發言",
        value: "J + D*0.3",
      },
      {
        quiz: "提出個效率最高的方案",
        value: "D + G*0.3",
      },
      {
        quiz: "讓大家投票最快啦！",
        value: "I + B*0.3",
      },
      {
        quiz: "興奮拋出新選項，吸引注意",
        value: "C + F*0.3",
      },
    ],
  },
  {
    moment: "大家想法不同",
    question: "有些人想玩雲霄飛車，有些人怕高，你？",
    options: [
      {
        quiz: "提議輪流陪，大家都能玩",
        value: "A + G*0.3",
      },
      {
        quiz: "順著氣氛，大家想玩就玩",
        value: "F + B*0.2",
      },
      {
        quiz: "幫忙協調讓兩邊都舒服",
        value: "G + D*0.2",
      },
      {
        quiz: "直接說服其中一方讓步",
        value: "H + A*0.3",
      },
      {
        quiz: "試圖讓氣氛不尷尬",
        value: "B + C*0.3",
      },
    ],
  },
  {
    moment: "悄悄話場景",
    question: "你發現有兩位朋友在旁邊講悄悄話，你會？",
    options: [
      {
        quiz: "心裡默默不舒服，但不說",
        value: "D + J*0.3",
      },
      {
        quiz: "裝沒事，但開始觀察氣氛",
        value: "C + A*0.2",
      },
      {
        quiz: "擔心自己是不是被排擠了",
        value: "K + G*0.2",
      },
      {
        quiz: "開玩笑說「你們在講我壞話喔？」",
        value: "H + F*0.2",
      },
    ],
  },
  {
    moment: "午餐時間",
    question: "你準備選餐點時會：",
    options: [
      {
        quiz: "問大家想吃什麼再決定",
        value: "B + C*0.3",
      },
      {
        quiz: "看到新推出的就想嘗試",
        value: "F + I*0.3",
      },
      {
        quiz: "快速決定自己最熟悉的",
        value: "D + J*0.3",
      },
      {
        quiz: "顧慮大家預算和習慣再說",
        value: "G + A*0.3",
      },
      {
        quiz: "跟著最多人選的一起點",
        value: "J + K*0.3",
      },
    ],
  },
  {
    moment: "爭執發生",
    question: "兩位朋友因小事爭執，你會：",
    options: [
      {
        quiz: "試著安撫氣氛，叫大家冷靜",
        value: "K + G*0.2 + J*0.1",
      },
      {
        quiz: "裝作沒聽到，怕被捲進去",
        value: "H + D*0.2",
      },
      {
        quiz: "像和事佬一樣努力調停",
        value: "A + J*0.2 + J*0.1",
      },
      {
        quiz: "想辦法轉移話題",
        value: "J + G*0.2 + A*0.1",
      },
      {
        quiz: "說點笑話緩和氣氛",
        value: "I + C*0.2 + F*0.1",
      },
    ],
  },
  {
    moment: "玩笑失控",
    question: "有人講話開過頭，有人不太開心，你？",
    options: [
      {
        quiz: "看誰情緒不對勁，暗中關心",
        value: "D + H*0.2 + G*0.1",
      },
      {
        quiz: "小聲勸朋友不要太過分",
        value: "G + J*0.2 + D*0.1",
      },
      {
        quiz: "轉移話題讓大家笑一笑",
        value: "C + I*0.2 + F*0.1",
      },
      {
        quiz: "覺得沒什麼，大家心臟大顆點",
        value: "F + C*0.2 + I*0.1",
      },
    ],
  },
  {
    moment: "陌生人搭話",
    question: "排隊時隔壁人突然搭話，你會？",
    options: [
      {
        quiz: "聊起來超自然還互加IG",
        value: "I + C*0.2 + F*0.1",
      },
      {
        quiz: "蠻開心地閒聊幾句",
        value: "F + I*0.2 + C*0.1",
      },
      {
        quiz: "微笑回應，但不主動聊",
        value: "A + J*0.2 + G*0.1",
      },
      {
        quiz: "笑一笑就滑手機裝忙",
        value: "J + A*0.2 + G*0.1",
      },
    ],
  },
  {
    moment: "唱K提議",
    question: "朋友提議離開後去唱KTV，你會？",
    options: [
      {
        quiz: "馬上附和說超想唱！",
        value: "C + I*0.3 + F*0.1",
      },
      {
        quiz: "擔心時間太晚會打擾家人",
        value: "K + A*0.2 + J*0.1",
      },
      {
        quiz: "覺得提議不錯，但自己不想唱",
        value: "H + D*0.2 + G*0.1",
      },
      {
        quiz: "陪去但不唱，當攝影師",
        value: "D + H*0.2 + G*0.1",
      },
    ],
  },
  {
    moment: "回顧旅程",
    question: "離開前大家在出口拍最後一張照，你在想？",
    options: [
      {
        quiz: "今天其實很開心，雖然中間有點小波折",
        value: "A + K*0.3 + G*0.1",
      },
      {
        quiz: "我好像又在迎合大家了？",
        value: "G + J*0.2 + D*0.1",
      },
      {
        quiz: "希望下次我們還能一起出來玩",
        value: "B + I*0.2 + K*0.1",
      },
      {
        quiz: "還好我沒有太突兀",
        value: "J + A*0.2 + G*0.1",
      },
      {
        quiz: "明天要來發限動好好整理一下照片",
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
