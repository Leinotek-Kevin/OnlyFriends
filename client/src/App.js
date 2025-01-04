import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomeComponent from "./components/home-component";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          {/* outlet 展示首次進來的第一個 index 畫面是 HomeComponent */}
          <Route index element={<HomeComponent />}></Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
