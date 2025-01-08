import React from "react";
import { Outlet } from "react-router-dom";
import Dashboard from "./dashboard-component";

const Layout = ({ userToken, setUserToken }) => {
  return (
    <>
      <Dashboard userToken={userToken} setUserToken={setUserToken} />
      <Outlet />
    </>
  );
};

export default Layout;
