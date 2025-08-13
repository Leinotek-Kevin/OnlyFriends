import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import AuthService from "./services/auth-service";
import LoginComponent from "./components/login-component";
import LandingComponent from "./components/landing-component";
import UsersComponent from "./components/users-component";
import JoinPartherComponent from "./components/join-parther-component";
import PartherDataComponent from "./components/parther-data-component";
import DashboardComponent from "./components/dashboard-component";
import DeleteComponent from "./components/delete-component";
import DrinkQuizComponent from "./components/quiz/drink-quiz-component";
import PartherAdminComponent from "./components/other/parther-admin-component";
import PartherDashboardComponent from "./components/other/parther-dashboard-component";

function App() {
  let [userToken, setUserToken] = useState(AuthService.getUserToken());

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          {/* 初始畫面-> Landing Page */}
          <Route index element={<LandingComponent />}></Route>
          {/*系統登入頁*/}
          <Route
            path="admin"
            element={
              <LoginComponent
                userToken={userToken}
                setUserToken={setUserToken}
              />
            }
          ></Route>
          {/*刪除帳號頁*/}
          <Route
            path="delete"
            element={<DeleteComponent></DeleteComponent>}
          ></Route>
          {/*系統數據儀表板*/}
          <Route
            path="dashboard"
            element={
              <DashboardComponent
                userToken={userToken}
                setUserToken={setUserToken}
              />
            }
          >
            {/*用戶列表*/}
            <Route
              path="users"
              index
              element={
                <UsersComponent
                  userToken={userToken}
                  setUserToken={setUserToken}
                ></UsersComponent>
              }
            ></Route>
            {/*加入聯盟行銷夥伴*/}
            <Route
              path="join-parther"
              index
              element={
                <JoinPartherComponent
                  userToken={userToken}
                  setUserToken={setUserToken}
                ></JoinPartherComponent>
              }
            ></Route>
            {/*聯盟行銷夥伴數據頁*/}
            <Route
              path="parther-data"
              element={
                <PartherDataComponent
                  userToken={userToken}
                  setUserToken={setUserToken}
                ></PartherDataComponent>
              }
            ></Route>
          </Route>
          {/*飲料小測驗*/}
          <Route path="drink-quiz" element={<DrinkQuizComponent />}></Route>
          {/*聯盟夥伴數據儀表板入口*/}
          <Route
            path="parther-admin"
            element={
              <PartherAdminComponent
                userToken={userToken}
                setUserToken={setUserToken}
              />
            }
          ></Route>
          <Route
            path="parther-dashboard"
            element={
              <PartherDashboardComponent
                userToken={userToken}
                setUserToken={setUserToken}
              />
            }
          ></Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
