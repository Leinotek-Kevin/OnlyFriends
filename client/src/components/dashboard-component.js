import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const DashboardComponent = ({ userToken, setUserToken }) => {
  let navigate = useNavigate();

  return (
    <div>
      <h1>這是儀表板首頁</h1>
    </div>
  );
};

export default DashboardComponent;
