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

module.exports = { isToday, getToday };
