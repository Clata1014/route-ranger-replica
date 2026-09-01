import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { hydrateFromCloud, startCloudSync } from "./lib/cloudProgress";

const root = createRoot(document.getElementById("root")!);

// Restore cloud progress BEFORE the first render, then keep autosaving.
hydrateFromCloud().finally(() => {
  startCloudSync();
  root.render(<App />);
});
