import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const ReportsComponent = ({ userToken, setUserToken }) => {
  let navigate = useNavigate();

  return (
    <div>
      <h1>這是檢舉列表頁</h1>
    </div>
  );
};

export default ReportsComponent;
