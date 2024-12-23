function isToday(timestamp) {
  const date = new Date(timestamp); // 由時間戳生成日期
  const today = new Date(); // 取得當前的日期

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

const getToday = () => {
  const now = new Date();

  const today =
    now.getFullYear() +
    "/" +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    "/" +
    now.getDate().toString().padStart(2, "0");

  return today;
};

//取得明天午夜的TimeStamp
const getTomorrowNight = () => {
  const currentDate = new Date(); // 获取当前系统时间

  // 設置為昨天的日期，並將時間設置為午夜 00:00:00
  currentDate.setDate(currentDate.getDate() + 1);
  currentDate.setHours(0, 0, 0, 0);

  const timestamp = currentDate.getTime(); // 獲取時間戳記

  return timestamp;
};

//取得昨天午夜的 TimeStamp
const getYesterdayNight = () => {
  const currentDate = new Date(); // 获取当前系统时间

  // 設置為昨天的日期，並將時間設置為午夜 00:00:00
  currentDate.setDate(currentDate.getDate() - 1);
  currentDate.setHours(0, 0, 0, 0);

  const timestamp = currentDate.getTime(); // 獲取時間戳記

  return timestamp;
};

//取得今天午夜的 TimeStamp
const getTodayNight = () => {
  const currentDate = new Date(); // 获取当前系统时间

  // 設置為昨天的日期，並將時間設置為午夜 00:00:00
  currentDate.setDate(currentDate.getDate());
  currentDate.setHours(0, 0, 0, 0);

  const timestamp = currentDate.getTime(); // 獲取時間戳記

  return timestamp;
};

const getFormatDate = (timestamp) => {
  // 創建 Date 物件
  const date = new Date(timestamp);

  // 提取各個部分的 UTC 時間
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // 月份從 0 開始，所以要加 1
  const day = String(date.getDay()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  // 提取星期幾
  const weekdays = [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
  ];
  const weekday = weekdays[date.getDay()]; // getUTCDay() 會返回 0-6，對應星期日到星期六

  // 格式化輸出：UTC 年月日時分秒
  return `${year}年${month}月${day}日 ${weekday} ${hours}時${minutes}分${seconds}秒`;
};

module.exports = {
  getFormatDate,
  isToday,
  getToday,
  getYesterdayNight,
  getTodayNight,
  getTomorrowNight,
};
