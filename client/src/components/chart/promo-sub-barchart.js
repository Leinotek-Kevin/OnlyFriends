import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PromoSubscribeBarChart = ({ referalCounts, referalSubCounts }) => {
  const rawMax = Math.max(referalCounts, referalSubCounts);
  const maxValue = Math.ceil(rawMax / 50) * 50;

  const data = {
    labels: ["推廣數", "訂閱數"],
    datasets: [
      {
        data: [referalCounts, referalSubCounts],
        backgroundColor: ["#0096b1", "#ff7f50"],
        borderRadius: 5,
        barPercentage: 0.6,
      },
    ],
  };

  const options = {
    indexAxis: "y",
    scales: {
      x: {
        min: 0,
        max: maxValue,
        ticks: {
          stepSize: 50,
          callback: (value) => value.toLocaleString(),
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false, // ❌ 關掉游標提示
        callbacks: {
          label: (context) => context.parsed.x.toLocaleString(),
        },
      },
      datalabels: {
        anchor: "end",
        align: "right",
        color: "#000",
        font: {
          weight: "bold",
          size: 14,
        },
        formatter: (value) => value.toLocaleString(),
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Bar data={data} options={options} plugins={[ChartDataLabels]} />
    </div>
  );
};

export default PromoSubscribeBarChart;
