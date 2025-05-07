const ReportReasons = Object.freeze([
  { itemID: "0", des_ZH: "頭像/資料不實", des_EN: "Fake Profile/Picture" },
  { itemID: "1", des_ZH: "惡意話語/攻擊", des_EN: "Malicious Words/Attacks" },
  { itemID: "2", des_ZH: "惡意騷擾", des_EN: "Malicious Harassment" },
  { itemID: "3", des_ZH: "色情低俗", des_EN: "Pornographic/Vulgar Content" },
  { itemID: "4", des_ZH: "疑似詐騙/釣魚", des_EN: "Suspected Scam/Phishing" },
  { itemID: "5", des_ZH: "廣告/銷售", des_EN: "Advertisement/Sales" },
  { itemID: "6", des_ZH: "未成年", des_EN: "Underage" },
  { itemID: "7", des_ZH: "其他原因", des_EN: "Other Reasons" },
]);

const Interesteds = Object.freeze([
  { itemID: "0", des_ZH: "聽音樂", des_EN: "Listen Music" },
  { itemID: "1", des_ZH: "玩音樂", des_EN: "Play Music" },
  { itemID: "2", des_ZH: "運動", des_EN: "Exercise" },
  { itemID: "3", des_ZH: "健身", des_EN: "Fitness" },
  { itemID: "4", des_ZH: "吃美食", des_EN: "Eat Gourmet Food" },
  { itemID: "5", des_ZH: "烹飪", des_EN: "Cooking" },
  { itemID: "6", des_ZH: "電影", des_EN: "Movies" },
  { itemID: "7", des_ZH: "遊戲", des_EN: "Gaming" },
  { itemID: "8", des_ZH: "動漫", des_EN: "Anime" },
  { itemID: "9", des_ZH: "閱讀", des_EN: "Reading" },
  { itemID: "10", des_ZH: "旅遊", des_EN: "Traveling" },
  { itemID: "11", des_ZH: "喝酒", des_EN: "Drinking" },
  { itemID: "12", des_ZH: "刺青", des_EN: "Tattoos" },
  { itemID: "13", des_ZH: "釣魚", des_EN: "Fishing" },
  { itemID: "14", des_ZH: "攝影", des_EN: "Photography" },
  { itemID: "15", des_ZH: "寫作", des_EN: "Writing" },
  { itemID: "16", des_ZH: "跳舞", des_EN: "Dancing" },
  { itemID: "17", des_ZH: "夾娃娃", des_EN: "Claw Machines" },
  { itemID: "18", des_ZH: "模型", des_EN: "Model Building" },
  { itemID: "19", des_ZH: "發呆", des_EN: "Daydreaming" },
  { itemID: "20", des_ZH: "睡覺", des_EN: "Sleeping" },
  { itemID: "21", des_ZH: "騎車", des_EN: "Cycling" },
  { itemID: "22", des_ZH: "散步", des_EN: "Walking" },
  { itemID: "23", des_ZH: "美妝", des_EN: "Beauty" },
  { itemID: "24", des_ZH: "時尚", des_EN: "Fashion" },
  { itemID: "25", des_ZH: "追星", des_EN: "Idol Fandom" },
  { itemID: "26", des_ZH: "夜生活", des_EN: "Nightlife" },
  { itemID: "27", des_ZH: "追劇", des_EN: "Binge-Watching Shows" },
]);

const Traits = Object.freeze([
  { itemID: "0", des_ZH: "愛講幹話", des_EN: "Loves to Talk Nonsense" },
  { itemID: "1", des_ZH: "撿到槍", des_EN: "Quick-witted" },
  { itemID: "2", des_ZH: "情緒穩定", des_EN: "Emotionally Stable" },
  { itemID: "3", des_ZH: "一枚小可愛", des_EN: "A Little Cutie" },
  { itemID: "4", des_ZH: "邏輯派", des_EN: "Logical Type" },
  { itemID: "5", des_ZH: "感性派", des_EN: "Emotional Type" },
  { itemID: "6", des_ZH: "腦洞很大", des_EN: "Very Imaginative" },
  { itemID: "7", des_ZH: "內向", des_EN: "Introverted" },
  { itemID: "8", des_ZH: "外向", des_EN: "Extroverted" },
  { itemID: "9", des_ZH: "隨性自由", des_EN: "Free-Spirited" },
  { itemID: "10", des_ZH: "表裡如一", des_EN: "Consistent Inside and Out" },
  { itemID: "11", des_ZH: "行動派", des_EN: "Action-Oriented" },
  { itemID: "12", des_ZH: "善於傾聽", des_EN: "Good Listener" },
  { itemID: "13", des_ZH: "誠實", des_EN: "Honest" },
  { itemID: "14", des_ZH: "愛聊天", des_EN: "Loves to Chat" },
  { itemID: "15", des_ZH: "享受孤獨", des_EN: "Enjoys Solitude" },
  { itemID: "16", des_ZH: "吃軟不吃硬", des_EN: "Soft but Not Hard" },
  {
    itemID: "17",
    des_ZH: "愛已讀亂回",
    des_EN: "Loves to Read but Replies Randomly",
  },
  { itemID: "18", des_ZH: "不按牌理出牌", des_EN: "Unpredictable" },
  { itemID: "19", des_ZH: "幽默", des_EN: "Humorous" },
  { itemID: "20", des_ZH: "可鹽可甜", des_EN: "Can Be Salty or Sweet" },
  {
    itemID: "21",
    des_ZH: "常被說直男",
    des_EN: "Often Called Straightforward",
  },
]);

const FriendMotives = Object.freeze([
  {
    itemID: "0",
    des_ZH: "想拓展朋友圈",
    des_EN: "Wants to Expand Social Circle",
  },
  {
    itemID: "1",
    des_ZH: "想交志同道合的朋友",
    des_EN: "Wants to Meet Like-Minded Friends",
  },
  { itemID: "2", des_ZH: "想享受曖昧", des_EN: "Wants to Enjoy Ambiguity" },
  { itemID: "3", des_ZH: "想脫離單身", des_EN: "Wants to Stop Being Single" },
  { itemID: "4", des_ZH: "好奇玩看看", des_EN: "Curious to Try" },
  { itemID: "5", des_ZH: "排遣無聊", des_EN: "Wants to Relieve Boredom" },
  { itemID: "6", des_ZH: "抒發情緒", des_EN: "Wants to Vent Emotions" },
]);

const Values = Object.freeze([
  {
    itemID: "0",
    des_ZH: "另一半跟朋友都重要",
    des_EN: "Both Partner and Friends Are Important",
  },
  { itemID: "1", des_ZH: "一個人也不錯", des_EN: "Being Alone Is Fine" },
  {
    itemID: "2",
    des_ZH: "相信一見鍾情",
    des_EN: "Believes in Love at First Sight",
  },
  {
    itemID: "3",
    des_ZH: "相信日久生情",
    des_EN: "Believes in Developing Feelings Over Time",
  },
  { itemID: "4", des_ZH: "不婚主義", des_EN: "Anti-Marriage" },
  { itemID: "5", des_ZH: "工作大於戀愛", des_EN: "Work Over Love" },
  {
    itemID: "6",
    des_ZH: "拒絕公主王子病",
    des_EN: "Rejects Princess/Prince Syndrome",
  },
  {
    itemID: "7",
    des_ZH: "拒絕媽寶爸寶",
    des_EN: "Rejects Mama's Boy/Papa's Boy",
  },
  {
    itemID: "8",
    des_ZH: "有訊息就會回",
    des_EN: "Replies to Messages Promptly",
  },
  { itemID: "9", des_ZH: "戀愛放第一", des_EN: "Puts Love First" },
  { itemID: "10", des_ZH: "浪漫主義", des_EN: "Romanticism" },
  { itemID: "11", des_ZH: "女權主義", des_EN: "Feminism" },
  { itemID: "12", des_ZH: "男權主義", des_EN: "Masculism" },
  { itemID: "13", des_ZH: "平權主義", des_EN: "Equal Rights Advocacy" },
  {
    itemID: "14",
    des_ZH: "拒絕已讀不回",
    des_EN: "Rejects Leaving Messages Unread",
  },
  {
    itemID: "15",
    des_ZH: "拒絕已讀亂回",
    des_EN: "Rejects Random Replies to Read Messages",
  },
  { itemID: "16", des_ZH: "需有同理心", des_EN: "Must Have Empathy" },
  { itemID: "17", des_ZH: "承諾必須做到", des_EN: "Promises Must Be Kept" },
  { itemID: "18", des_ZH: "AA制", des_EN: "Dutch Pay" },
]);

const TopicNames = Object.freeze([
  {
    itemID: "t-default-00",
    des_ZH: "預設",
    des_EN: "Default",
  },
  //真人驗證貓貓
  {
    itemID: "t-cat-02",
    des_ZH: "真喵驗證",
    des_EN: "True Cat",
  },
  //貓貓
  {
    itemID: "t-cat-01",
    des_ZH: "紙飛心事",
    des_EN: "Paper Mood",
  },
  //天竺鼠
  {
    itemID: "t-guinea-03",
    des_ZH: "奶茶時光",
    des_EN: "Milk-Tea Time",
  },
  //水獺
  {
    itemID: "t-otter-05",
    des_ZH: "搖滾小奶獺",
    des_EN: "Rock Otter",
  },
  //小企鵝
  {
    itemID: "t-penguin-02",
    des_ZH: "出企玩",
    des_EN: "Penguin Outing",
  },
  //小熊貓
  {
    itemID: "t-red-panda-04",
    des_ZH: "能躺就不坐",
    des_EN: "Just Lay Down",
  },
]);

const CircleTopicNames = Object.freeze([
  {
    itemID: "random",
    des_ZH: "隨機加入小圈圈",
    des_EN: "Randomly Join",
  },
  {
    itemID: "movie-1",
    des_ZH: "電影欣賞",
    des_EN: "Movie Appreciation",
  },
  {
    itemID: "cartoon-1",
    des_ZH: "動漫迷",
    des_EN: "Cartoon Fans",
  },
  {
    itemID: "game-1",
    des_ZH: "遊戲同樂會",
    des_EN: "Game Party",
  },
  {
    itemID: "food-1",
    des_ZH: "甜點吃貨",
    des_EN: "Dessert Foodie",
  },
  {
    itemID: "food-2",
    des_ZH: "美食發掘家",
    des_EN: "Food Explorer",
  },
  {
    itemID: "food-3",
    des_ZH: "烹飪小達人",
    des_EN: "Cooking Master",
  },
  {
    itemID: "liquor-1",
    des_ZH: "微醺酒吧",
    des_EN: "Tipsy Bar",
  },
  {
    itemID: "travel-1",
    des_ZH: "小小旅行團",
    des_EN: "Tour Group",
  },
  {
    itemID: "basketball-1",
    des_ZH: "籃球同好",
    des_EN: "Basketball Fans",
  },
  {
    itemID: "fashion-1",
    des_ZH: "時尚美妝",
    des_EN: "Fashion Beauty",
  },
  {
    itemID: "reading-1",
    des_ZH: "閱讀室",
    des_EN: "Reading Room",
  },
  {
    itemID: "photography-1",
    des_ZH: "攝影交流",
    des_EN: "Photography Exchange",
  },
]);

module.exports = {
  TopicNames,
  ReportReasons,
  Interesteds,
  Traits,
  FriendMotives,
  Values,
  CircleTopicNames,
};
