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

//取得昨天午夜的 TimeStamp
const getYesterdayNight = () => {
  const currentDate = new Date(); // 取得當前的日期

  console.log("現在日期", currentDate.getDate());

  //設置為昨天的日期，並將時間設置為午夜 00:00:00
  currentDate.setDate(currentDate.getDate() - 1);
  currentDate.setHours(0, 0, 0, 0);

  console.log("午夜日期", currentDate.getDate());

  const timestamp = currentDate.getTime(); // 時間戳記

  console.log("輸出戳記", timestamp);
  return timestamp;
};

module.exports = { isToday, getToday, getYesterdayNight };
