import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(ArcElement, Tooltip, Legend);

const GenderPieChart = ({
  maleCount,
  femaleCount,
  specialCount,
  left,
  position,
}) => {
  const data = {
    labels: ["男性", "女性", "特別"],
    datasets: [
      {
        data: [maleCount, femaleCount, specialCount], // ✅ 加入特別數據
        backgroundColor: ["#4a90e2", "#ff6b81", "#ffd166"], // 男藍 女粉 特別黃
        borderWidth: 1,
      },
    ],
  };

  const options = {
    layout: {
      padding: {
        // left: 80,"right"
        left,
        right: 0,
      },
    },
    plugins: {
      legend: {
        position,
      },
      tooltip: {
        enabled: false, // ❌ 關掉游標提示
      },

      datalabels: {
        color: "#fff",
        font: {
          weight: "bold",
          size: 14,
        },
        formatter: (value, context) => {
          if (value === 0) return ""; // ❌ 不顯示 0
          const dataset = context.chart.data.datasets[0].data;
          const total = dataset.reduce((a, b) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1) + "%";
          return `${value} (${percentage})`;
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Pie data={data} options={options} plugins={[ChartDataLabels]} />
    </div>
  );
};

export default GenderPieChart;
