import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const UsersComponent = ({ userToken, setUserToken }) => {
  let navigate = useNavigate();

  return (
    <div>
      <h1>這是用戶列表頁</h1>
    </div>
  );
};

export default UsersComponent;
