import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomeComponent from "./components/home-component";
import LoginComponent from "./components/login-component";
import LandingComponent from "./components/landing-component";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          {/* outlet 展示首次進來的第一個 index 畫面是 HomeComponent */}
          <Route index element={<LandingComponent />}></Route>
          <Route path="admin" element={<LoginComponent />}></Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
