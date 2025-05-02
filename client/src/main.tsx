import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add Font Awesome
const fontAwesomeLink = document.createElement('link');
fontAwesomeLink.rel = 'stylesheet';
fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
document.head.appendChild(fontAwesomeLink);

// Add title
const title = document.createElement('title');
title.textContent = 'Discord ChatGPT Bot';
document.head.appendChild(title);

createRoot(document.getElementById("root")!).render(<App />);
