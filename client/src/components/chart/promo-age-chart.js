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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ChartDataLabels
);

const AgeGenderBarChart = ({
  labels,
  maleData,
  femaleData,
  specialData,
  left,
  position,
}) => {
  const data = {
    labels,
    datasets: [
      {
        label: "男性",
        data: maleData,
        backgroundColor: "#4a90e2",
      },
      {
        label: "女性",
        data: femaleData,
        backgroundColor: "#ff6b81",
      },
      {
        label: "特別",
        data: specialData,
        backgroundColor: "#ffd166",
      },
    ],
  };

  const maxDataValue = Math.max(...maleData, ...femaleData, ...specialData);

  const maxY = Math.max(50, Math.ceil(maxDataValue / 50) * 50);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position,
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => context.parsed.x.toLocaleString(),
        },
      },
      datalabels: {
        anchor: "end",
        align: "top",
        color: "#000",
        font: {
          weight: "normal",
          size: 14,
        },
        formatter: (value) => {
          return value === 0 ? null : value.toLocaleString();
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,

    scales: {
      x: {
        stacked: false,
      },
      y: {
        beginAtZero: true,
        max: maxY,
        ticks: {
          stepSize: 50,
        },
      },
    },
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column", // 方向 column
        justifyContent: "center", // 垂直置中
        alignItems: "center", // 水平置中
      }}
    >
      <Bar data={data} options={options} plugins={[ChartDataLabels]} />
    </div>
  );
};

export default AgeGenderBarChart;
