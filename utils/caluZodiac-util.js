// 計算星座
const caluUserZodiac = function getZodiacSign(userBirthday) {
  const date = new Date(userBirthday); // 將字串轉為 Date 物件
  const day = date.getDate();
  const month = date.getMonth() + 1;

  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
    return 11; // 水瓶座
  } else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) {
    return 12; // 雙魚座
  } else if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
    return 1; // 牡羊座
  } else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
    return 2; // 金牛座
  } else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
    return 3; // 雙子座
  } else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
    return 4; // 巨蟹座
  } else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    return 5; // 獅子座
  } else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
    return 6; // 處女座
  } else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
    return 7; // 天秤座
  } else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
    return 8; // 天蠍座
  } else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
    return 9; // 射手座
  } else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    return 10; // 摩羯座
  }
};

module.exports = caluUserZodiac;
