import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomeComponent from "./components/home-component";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route>
          <Route path="home" element={<HomeComponent />}></Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
