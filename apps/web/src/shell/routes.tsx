// Owner: Shruthi. Routes exactly as UI/UX Specs §2 names them. P3 Re-test
// reuses the P1 route (role=retest is a query/state concern for Reshma's M1
// work, not a separate path).
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { SetupScreen } from "../screens/progress/setup/SetupScreen";
import { RoundMapScreen } from "../screens/progress/round-map/RoundMapScreen";
import { PlanScreen } from "../screens/progress/plan/PlanScreen";
import { ReadinessMapScreen } from "../screens/progress/readiness-map/ReadinessMapScreen";
import { DebriefScreen } from "../screens/progress/debrief/DebriefScreen";
import { ProbeScreen } from "../screens/practice/probe/ProbeScreen";
import { DrillScreen } from "../screens/practice/drill/DrillScreen";
import { ProjectDefenseScreen } from "../screens/practice/project-defense/ProjectDefenseScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <PlanScreen /> }, // S3 Plan is home
      { path: "setup", element: <SetupScreen /> }, // S1
      { path: "round-map", element: <RoundMapScreen /> }, // S2
      { path: "map", element: <ReadinessMapScreen /> }, // S4
      { path: "debrief", element: <DebriefScreen /> }, // S5
      { path: "probe/:ladderId", element: <ProbeScreen /> }, // P1 / P3 (role=retest)
      { path: "drill/:gapId", element: <DrillScreen /> }, // P2
      { path: "project", element: <ProjectDefenseScreen /> }, // P4
    ],
  },
]);
