import { createRoot } from "react-dom/client";
import { Router, Route, Switch } from "wouter";
import App from "./App";
import AdminPage from "./pages/AdminPage";
import CameraPage from "./pages/CameraPage";
import AtlasOfficePage from "./pages/AtlasOfficePage";
import "./index.css";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <Router base={base}>
    <Switch>
      <Route path="/admin" component={AdminPage} />
      <Route path="/camera" component={CameraPage} />
      <Route path="/atlas" component={AtlasOfficePage} />
      <Route component={App} />
    </Switch>
  </Router>
);
