import { Outlet } from "react-router-dom";
import Nav from "./nav-component";

const Layout = ({ currentUser, setCurrentUser }) => {
  return (
    <>
      <Nav currentUser={currentUser} setCurrentUser={setCurrentUser} />
      {/* Outlet 會自動在 Layout 下的其他 Route 標籤內自動轉換 */}
      <Outlet />
    </>
  );
};

export default Layout;
