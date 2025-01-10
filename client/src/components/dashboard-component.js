import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../styles/dashboard.css";

const DashboardComponent = ({ userToken, setUserToken }) => {
  let navigate = useNavigate();

  console.log("userToken", userToken);

  useEffect(() => {
    const hamBurger = document.querySelector(".toggle-btn");

    const toggleSidebar = () => {
      document.querySelector("#sidebar").classList.toggle("expand");
    };

    if (hamBurger) {
      hamBurger.addEventListener("click", toggleSidebar);
    }

    // Clean up the event listener when the component unmounts
    //移除事件監聽,避免內存外洩
    return () => {
      if (hamBurger) {
        hamBurger.removeEventListener("click", toggleSidebar);
      }
    };
  }, []);

  useEffect(() => {
    if (userToken) {
      //toast.success("Success message")：成功樣式，通常為綠色。
      toast.success("歡迎使用 OnlyFriends 系統！", {
        position: "top-right", // 位置正上方
        autoClose: 2000, // 自動關閉時間
        hideProgressBar: true, //顯示進度條
        closeOnClick: true, // 點擊後關閉
        pauseOnHover: true, // 滑鼠懸停時暫停自動關閉
        draggable: true, // 允許滑動關閉
        progress: undefined, // 默認的進度條
      });
    } else {
      navigate("/admin"); // 如果没有 token，跳转到登录页面
    }
  }, [userToken]);

  return (
    <div class="wrapper">
      <aside id="sidebar">
        <div class="d-flex">
          <button class="toggle-btn" type="button">
            <i class="lni lni-grid-alt"></i>
          </button>
          <div class="sidebar-logo">
            <a href="#">OnlyFriends</a>
          </div>
        </div>
        <ul class="sidebar-nav">
          <li class="sidebar-item">
            <a href="#" class="sidebar-link">
              <i class="lni lni-user"></i>
              <span>Profile</span>
            </a>
          </li>
          <li class="sidebar-item">
            <a href="#" class="sidebar-link">
              <i class="lni lni-agenda"></i>
              <span>Task</span>
            </a>
          </li>
          <li class="sidebar-item">
            <a
              href="#"
              class="sidebar-link collapsed has-dropdown"
              data-bs-toggle="collapse"
              data-bs-target="#auth"
              aria-expanded="false"
              aria-controls="auth"
            >
              <i class="lni lni-protection"></i>
              <span>Auth</span>
            </a>
            <ul
              id="auth"
              class="sidebar-dropdown list-unstyled collapse"
              data-bs-parent="#sidebar"
            >
              <li class="sidebar-item">
                <a href="#" class="sidebar-link">
                  Login
                </a>
              </li>
              <li class="sidebar-item">
                <a href="#" class="sidebar-link">
                  Register
                </a>
              </li>
            </ul>
          </li>
          <li class="sidebar-item">
            <a
              href="#"
              class="sidebar-link collapsed has-dropdown"
              data-bs-toggle="collapse"
              data-bs-target="#multi"
              aria-expanded="false"
              aria-controls="multi"
            >
              <i class="lni lni-layout"></i>
              <span>Multi Level</span>
            </a>
            <ul
              id="multi"
              class="sidebar-dropdown list-unstyled collapse"
              data-bs-parent="#sidebar"
            >
              <li class="sidebar-item">
                <a
                  href="#"
                  class="sidebar-link collapsed"
                  data-bs-toggle="collapse"
                  data-bs-target="#multi-two"
                  aria-expanded="false"
                  aria-controls="multi-two"
                >
                  Two Links
                </a>
                <ul
                  id="multi-two"
                  class="sidebar-dropdown list-unstyled collapse"
                >
                  <li class="sidebar-item">
                    <a href="#" class="sidebar-link">
                      Link 1
                    </a>
                  </li>
                  <li class="sidebar-item">
                    <a href="#" class="sidebar-link">
                      Link 2
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li class="sidebar-item">
            <a href="#" class="sidebar-link">
              <i class="lni lni-popup"></i>
              <span>Notification</span>
            </a>
          </li>
          <li class="sidebar-item">
            <a href="#" class="sidebar-link">
              <i class="lni lni-cog"></i>
              <span>Setting</span>
            </a>
          </li>
        </ul>
        <div class="sidebar-footer">
          <a href="#" class="sidebar-link">
            <i class="lni lni-exit"></i>
            <span>Logout</span>
          </a>
        </div>
      </aside>
      <div class="main p-3">
        <div class="text-center">
          <h1>Dashboard </h1>
        </div>
      </div>
      {/* 加入 ToastContainer 以显示 Toast */}
      <ToastContainer />
    </div>
  );
};

export default DashboardComponent;
