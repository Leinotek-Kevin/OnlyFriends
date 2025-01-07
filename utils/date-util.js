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

function formatTimestamp(timestamp) {
  const date = new Date(timestamp); // 確保時間戳是整數型別
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // 月份從 0 開始，需加 1
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

module.exports = {
  formatTimestamp,
  isToday,
  getToday,
  getYesterdayNight,
  getTodayNight,
  getTomorrowNight,
};
