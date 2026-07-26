import { createRoot } from "react-dom/client";
import { Router, Route, Switch } from "wouter";
import App from "./App";
import AdminPage from "./pages/AdminPage";
import CameraPage from "./pages/CameraPage";
import AtlasOfficePage from "./pages/AtlasOfficePage";
import TheatrePage from "./pages/TheatrePage";
import HallwayPage from "./pages/HallwayPage";
import OfficePage from "./pages/OfficePage";
import "./index.css";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <Router base={base}>
    {/* Dark wrapper prevents white flash between route transitions */}
    <div style={{ width: "100vw", height: "100vh", background: "#06040e", overflow: "hidden" }}>
      <Switch>
        <Route path="/admin" component={AdminPage} />
        <Route path="/camera" component={CameraPage} />
        <Route path="/theatre" component={TheatrePage} />
        <Route path="/hallway/:side" component={HallwayPage} />
        <Route path="/atlas" component={AtlasOfficePage} />
        <Route path="/office/:id" component={OfficePage} />
        <Route component={App} />
      </Switch>
    </div>
  </Router>
);
