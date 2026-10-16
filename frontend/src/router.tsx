import { createBrowserRouter } from "react-router";
import { MarketingLayout } from "./components/layout/MarketingLayout";
import { AppShell } from "./components/app/AppShell";
import { RequireAuth } from "./auth/RequireAuth";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { ModelCard } from "./pages/ModelCard";
import { SharedReport } from "./pages/SharedReport";
import { Projects } from "./pages/Projects";
import { ProjectDashboard } from "./pages/ProjectDashboard";
import { Inbox } from "./pages/Inbox";
import { Settings } from "./pages/Settings";

export const router = createBrowserRouter([
  {
    Component: MarketingLayout,
    children: [
      { index: true, Component: Landing },
      { path: "login", Component: Login },
      { path: "model", Component: ModelCard },
      { path: "r/:token", Component: SharedReport },
    ],
  },
  {
    Component: RequireAuth,
    children: [
      {
        Component: AppShell,
        children: [
          { path: "app", Component: Projects },
          { path: "app/p/:projectId", Component: ProjectDashboard },
          { path: "app/p/:projectId/inbox", Component: Inbox },
          { path: "app/p/:projectId/settings", Component: Settings },
        ],
      },
    ],
  },
]);
