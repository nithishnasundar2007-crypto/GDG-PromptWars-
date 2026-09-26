import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { LandingScreen } from "../screens/LandingScreen";
import { PlanScreen } from "../screens/progress/plan/PlanScreen";
import { ProbePracticeScreen } from "../screens/practice/probe/ProbePracticeScreen";
import { ProbeScreen } from "../screens/practice/probe/ProbeScreen";
import { ReadinessMapScreen } from "../screens/progress/readiness-map/ReadinessMapScreen";
import { ProjectDefenseScreen } from "../screens/practice/project-defense/ProjectDefenseScreen";
import { AiCoachScreen } from "../screens/practice/coach/AiCoachScreen";
import { ProfileSettingsScreen } from "../screens/progress/profile/ProfileSettingsScreen";
import { SetupScreen } from "../screens/progress/setup/SetupScreen";
import { RoundMapScreen } from "../screens/progress/round-map/RoundMapScreen";
import { DebriefScreen } from "../screens/progress/debrief/DebriefScreen";
import { DrillScreen } from "../screens/practice/drill/DrillScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <LandingScreen /> }, // 01 Landing Page / Introduce
      { path: "introduce", element: <LandingScreen /> },
      { path: "plan", element: <PlanScreen /> }, // 02 Plan Roadmap
      { path: "round-map", element: <RoundMapScreen /> },
      { path: "practice", element: <ProbePracticeScreen /> }, // 03 Probe Practice
      { path: "probe", element: <ProbePracticeScreen /> },
      { path: "probe/:ladderId", element: <ProbeScreen /> }, // 04 Question Solve & 05 Question Result
      { path: "map", element: <ReadinessMapScreen /> }, // 06 Readiness Map
      { path: "readiness", element: <ReadinessMapScreen /> },
      { path: "project", element: <ProjectDefenseScreen /> }, // 07 Project Defense
      { path: "defense", element: <ProjectDefenseScreen /> },
      { path: "coach", element: <AiCoachScreen /> }, // 08 AI Coach
      { path: "profile", element: <ProfileSettingsScreen /> }, // 09 Profile & Settings
      { path: "setup", element: <SetupScreen /> },
      { path: "debrief", element: <DebriefScreen /> },
      { path: "drill/:gapId", element: <DrillScreen /> },
      { path: "*", element: <LandingScreen /> },
    ],
  },
]);
