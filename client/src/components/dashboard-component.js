import { useEffect, useState } from "react";
import { useNavigate, Link, Outlet } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import AuthService from "../services/auth-service";
import "react-toastify/dist/ReactToastify.css";
import "../styles/dashboard.css";

//Only Friends 首頁儀表板
const DashboardComponent = ({ userToken, setUserToken }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleLogout = (e) => {
    e.preventDefault();
    const confirmed = window.confirm("你確定要登出 OnlyFriends 系統嗎？");
    if (confirmed) {
      AuthService.logout();
      navigate("/admin");
    }
  };

  useEffect(() => {
    if (userToken) {
      toast.success("歡迎使用 OnlyFriends 系統！", {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } else {
      navigate("/admin");
    }
  }, [userToken]);

  // 點擊 menu 時自動收起 sidebar
  const handleMenuClick = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="dashboard">
      <div className="wrapper">
        <aside id="sidebar" className={isSidebarOpen ? "expand" : ""}>
          <div className="d-flex">
            <button className="toggle-btn" onClick={toggleSidebar}>
              <i className="lni lni-grid-alt"></i>
            </button>
            <div className="sidebar-logo">
              <a href="#">OnlyFriends</a>
            </div>
          </div>
          <ul className="sidebar-nav">
            <li className="sidebar-item">
              <Link className="sidebar-link" to="users">
                <i className="lni lni-user"></i>
                <span>用戶資訊</span>
              </Link>
            </li>
            <li className="sidebar-item">
              <a
                href="#"
                className="sidebar-link collapsed has-dropdown"
                data-bs-toggle="collapse"
                data-bs-target="#partner"
                aria-expanded="false"
                aria-controls="partner"
              >
                <i className="bi bi-megaphone"></i>
                <span>聯盟行銷</span>
              </a>
              <ul
                id="partner"
                className="sidebar-dropdown list-unstyled collapse"
                data-bs-parent="#sidebar"
              >
                <li className="sidebar-item">
                  <Link className="sidebar-link" to="join-parther">
                    申請加入夥伴
                  </Link>
                </li>
                <li className="sidebar-item">
                  <Link className="sidebar-link" to="parther-data">
                    夥伴推廣數據
                  </Link>
                </li>
              </ul>
            </li>
          </ul>
          <div className="sidebar-footer" onClick={handleLogout}>
            <a href="#" className="sidebar-link">
              <i className="lni lni-exit"></i>
              <span>登出</span>
            </a>
          </div>
        </aside>
        <div className="main">
          <Outlet />
        </div>
        <ToastContainer />
      </div>
    </div>
  );
};

export default DashboardComponent;
