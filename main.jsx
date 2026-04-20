import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import WorkoutApp from "./workout-app";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WorkoutApp />
  </StrictMode>
);
