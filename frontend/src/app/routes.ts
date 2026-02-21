import { createBrowserRouter, redirect } from "react-router";
import { Layout } from "./components/layout";
import { HomePage } from "./components/home-page";
import { LiveDemo } from "./components/live-demo";
import { HowItWorksPage } from "./components/how-it-works-page";
import { CityView } from "./components/city-view";
import { AnalyticsDashboard } from "./components/analytics-dashboard";
import { UploadHistory } from "./components/upload-history";
import { ApiDocs } from "./components/api-docs";
import { AdminPage } from "./components/admin-page";
import { AskChat } from "./components/ask-chat";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "demo", Component: LiveDemo },
      { path: "how-it-works", Component: HowItWorksPage },
      { path: "city-view", Component: CityView },
      { path: "analytics", Component: AnalyticsDashboard },
      { path: "history", Component: UploadHistory },
      { path: "api", Component: ApiDocs },
      { path: "model-lab", Component: AdminPage },
      { path: "chat", Component: AskChat },
      { path: "*", loader: () => redirect("/") },
    ],
  },
]);