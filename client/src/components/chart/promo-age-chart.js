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

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const AgeGenderBarChart = ({ labels, maleData, femaleData, specialData }) => {
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
        position: "right",
      },
      tooltip: {
        enabled: true,
      },
    },
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
    <div style={{ width: "90%", height: "300px" }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default AgeGenderBarChart;
