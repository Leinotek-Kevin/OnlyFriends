import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import AuthService from "./services/auth-service";
import LoginComponent from "./components/login-component";
import LandingComponent from "./components/landing-component";
import UsersComponent from "./components/users-component";
import ReportsComponent from "./components/reports-component";
import DeleteComponent from "./components/delete-component";
import DrinkQuizComponent from "./components/quiz/drink-quiz-component";
import Layout from "./components/layout";

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
              <Layout userToken={userToken} setUserToken={setUserToken} />
            }
          >
            {/*用戶列表*/}
            <Route
              path="users"
              element={
                <UsersComponent
                  userToken={userToken}
                  setUserToken={setUserToken}
                ></UsersComponent>
              }
            ></Route>
            {/*檢舉列表*/}
            <Route
              path="reports"
              element={
                <ReportsComponent
                  userToken={userToken}
                  setUserToken={setUserToken}
                ></ReportsComponent>
              }
            ></Route>
          </Route>
          {/*飲料小測驗*/}
          <Route path="drink-quiz" element={<DrinkQuizComponent />}></Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
