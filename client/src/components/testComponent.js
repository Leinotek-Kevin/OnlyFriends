import { useEffect, useState } from "react";
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  BarController,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// 註冊必要的組件
Chart.register(
  BarElement,
  CategoryScale,
  LinearScale,
  BarController,
  Title,
  Tooltip,
  Legend
);

const AgeDistributionChart = () => {
  const [ageData, setAgeData] = useState({
    ageGroups: [],
    maleCounts: [],
    femaleCounts: [],
  });

  useEffect(() => {
    // 請求 API 獲取年齡分佈數據
    setAgeData({
      ageGroups: [
        "18-22",
        "23-27",
        "28-32",
        "33-37",
        "38-42",
        "43-47",
        "48-52",
      ],
      maleCounts: [50, 40, 30, 20, 15, 10, 5],
      femaleCounts: [45, 35, 25, 15, 10, 5, 2],
    });
  }, []);

  useEffect(() => {
    if (ageData.ageGroups.length > 0) {
      const ctx = document.getElementById("agePyramidChart").getContext("2d");

      new Chart(ctx, {
        type: "bar",
        data: {
          labels: ageData.ageGroups, // 年齡區間
          datasets: [
            {
              label: "男性",
              data: ageData.maleCounts.map((count) => -count), // 男性數據取負來實現反向顯示
              backgroundColor: "rgba(54, 162, 235, 0.6)", // 男性條形的顏色
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 1,
            },
            {
              label: "女性",
              data: ageData.femaleCounts, // 女性對應年齡段的人數
              backgroundColor: "rgba(255, 99, 132, 0.6)", // 女性條形的顏色
              borderColor: "rgba(255, 99, 132, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          indexAxis: "y", // 條形圖橫向顯示
          responsive: true,
          plugins: {
            legend: {
              position: "top", // 圖例的位置
            },
            title: {
              display: true,
              text: "男女年齡分佈金字塔圖",
            },
            tooltip: {
              callbacks: {
                label: function (tooltipItem) {
                  let value = tooltipItem.raw;
                  if (value < 0) value = -value; // 反向顯示負數為正
                  return value;
                },
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                callback: function (value) {
                  return Math.abs(value); // X 軸顯示正數
                },
              },
            },
          },
        },
      });
    }
  }, [ageData]);

  return <canvas id="agePyramidChart" width="600" height="400"></canvas>;
};

export default AgeDistributionChart;
