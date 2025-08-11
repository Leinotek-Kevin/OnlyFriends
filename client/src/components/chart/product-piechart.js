import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(ArcElement, Tooltip, Legend);

const SubscriptionPieChart = ({
  monthlyCounts,
  quarterlyCounts,
  annualCounts,
}) => {
  const data = {
    labels: ["月訂閱", "季訂閱", "年訂閱"],
    datasets: [
      {
        data: [monthlyCounts, quarterlyCounts, annualCounts],
        backgroundColor: ["#0096b1", "#ff7f50", "#ffd166"],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    layout: {
      padding: {
        left: 80, // 往右推
        right: 0,
      },
    },
    plugins: {
      legend: {
        position: "right",
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
    <div style={{ width: "90%", height: "300px" }}>
      <Pie data={data} options={options} plugins={[ChartDataLabels]} />
    </div>
  );
};

export default SubscriptionPieChart;
