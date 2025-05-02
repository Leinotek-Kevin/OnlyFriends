const topicModels = [
  {
    topic: "movie",
    circleReadyUsers: ["u1", "u2", "u3", "u4", "u1", "u2", "u3", "u4"],
  }, // 4人
  { topic: "toy", circleReadyUsers: ["u5"] }, // 1人
  { topic: "sport", circleReadyUsers: ["u6", "u7"] }, // 2人
  { topic: "sleep", circleReadyUsers: [] }, // 0人
  { topic: "game", circleReadyUsers: [] }, // 0人
];

function groupUsersByCircleModel(topicModels) {
  const finalGroups = [];
  const randomTopic = { topic: "random", circleReadyUsers: [] };

  let totalUsers = 0;
  topicModels.forEach(({ circleReadyUsers }) => {
    totalUsers += circleReadyUsers.length;
  });

  // Step 1: 若所有報名人數總和 < 5，將人加入隨機主題
  if (totalUsers < 5) {
    topicModels.forEach(({ topic, circleReadyUsers }) => {
      if (circleReadyUsers.length > 0) {
        randomTopic.circleReadyUsers.push(...circleReadyUsers);
        console.log(
          `報名人數小於5，將 ${circleReadyUsers.length} 人加入 random 主題`
        );
      }
    });
  } else {
    // Step 2: 將不滿 5 人的主題的這些人塞進 random 主題
    topicModels.forEach(({ topic, circleReadyUsers }) => {
      if (circleReadyUsers.length < 5) {
        randomTopic.circleReadyUsers.push(...circleReadyUsers);
        console.log(
          `主題 ${topic} 不滿5人，將 ${circleReadyUsers.length} 人加入 random 主題`
        );
      }
    });
  }

  // Step 3: 處理 random 主題，將人分為 5 或 7 人一團
  let remainingRandomUsers = [...randomTopic.circleReadyUsers];
  let remainingUsers = [];

  while (remainingRandomUsers.length >= 5) {
    let groupSize = remainingRandomUsers.length >= 7 ? 7 : 5; // 優先 7 人一組
    const group = remainingRandomUsers.splice(0, groupSize);
    remainingUsers.push(...group);
    console.log(`random 主題分配 ${groupSize} 人一團`);
  }

  // Step 4: random 剩餘的人，隨機加入滿 5 人以上的主題
  if (remainingUsers.length > 0) {
    const eligibleGroups = topicModels.filter(
      (t) => t.circleReadyUsers.length > 0
    );
    const randomGroup =
      eligibleGroups[Math.floor(Math.random() * eligibleGroups.length)];
    randomGroup.circleReadyUsers.push(...remainingUsers);
    console.log(
      `將剩餘 ${remainingUsers.length} 人加入主題 ${randomGroup.topic}`
    );
  }

  // Step 5: 處理滿 5 人以上的主題，將每團人數設為 5 或 7，剩餘的分配到 5-9 人團體
  topicModels.forEach(({ topic, circleReadyUsers }) => {
    if (circleReadyUsers.length >= 5) {
      let groupSize;
      while (circleReadyUsers.length >= 5) {
        groupSize = circleReadyUsers.length >= 7 ? 7 : 5; // 優先 5 或 7 人一組
        const group = circleReadyUsers.splice(0, groupSize);
        finalGroups.push({ topic, members: group });
        console.log(`主題 ${topic} 分配 ${groupSize} 人一團`);
      }
    }
  });

  return finalGroups;
}

// 執行並查看結果
const result = groupUsersByCircleModel(topicModels);
console.log("最終分團結果:", JSON.stringify(result, null, 2));
