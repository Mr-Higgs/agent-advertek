import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AdvertekAgent from "./advertek-agent.js";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}

createRoot(container).render(
  <StrictMode>
    <AdvertekAgent />
  </StrictMode>,
);
