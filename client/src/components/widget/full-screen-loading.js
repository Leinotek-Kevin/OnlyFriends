import React from "react";
import { Spin } from "antd";

export default function FullScreenLoading({ loading }) {
  if (!loading) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <Spin
        size="large"
        className="custom-spin"
        style={{ transform: "scale(2)" }}
      />
      <style jsx>{`
        .custom-spin .ant-spin-dot-item {
          background-color: #0096b1 !important;
        }
      `}</style>
    </div>
  );
}
