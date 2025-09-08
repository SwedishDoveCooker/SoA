import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { Theme } from "@radix-ui/themes";
import { MusicProvider } from "./hooks/useMusic";

import "@radix-ui/themes/styles.css";
import "./base.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Theme
        accentColor="mint"
        grayColor="gray"
        panelBackground="solid"
        scaling="90%"
        radius="full"
      >
        <MusicProvider>
          <App />
        </MusicProvider>
      </Theme>
    </BrowserRouter>
  </React.StrictMode>
);
