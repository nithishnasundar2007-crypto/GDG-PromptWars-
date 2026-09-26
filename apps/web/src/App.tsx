import { RouterProvider } from "react-router-dom";
import { router } from "./shell/routes";

export default function App() {
  return <RouterProvider router={router} />;
}
