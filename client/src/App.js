import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import AuthService from "./services/auth-service";
import HomeComponent from "./components/home-component";
import LoginComponent from "./components/login-component";
import LandingComponent from "./components/landing-component";

function App() {
  let [userToken, setUserToken] = useState(AuthService.getUserToken());
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          {/* outlet 展示首次進來的第一個 index 畫面是 HomeComponent */}
          <Route index element={<LandingComponent />}></Route>
          <Route
            path="admin"
            element={
              <LoginComponent
                userToken={userToken}
                setUserToken={setUserToken}
              />
            }
          ></Route>
          <Route
            path="dashboard"
            element={
              <HomeComponent
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
