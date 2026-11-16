/**
 * Entry point that mounts the React New Tab dashboard into the `#root` DOM element.
 */

import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "@/src/assets/tailwind.css";
import "./style.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);