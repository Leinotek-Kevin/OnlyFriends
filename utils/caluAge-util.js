const caluUserAge = function (userBirthday) {
  // 使用者的生日
  const birthday = new Date(userBirthday);

  // 取得當前日期
  const today = new Date();

  // 計算年齡
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDiff = today.getMonth() - birthday.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthday.getDate())
  ) {
    age--;
  }

  return age;
};

module.exports = caluUserAge;
