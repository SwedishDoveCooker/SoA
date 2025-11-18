
import { Window } from "@tauri-apps/api/window";
import {
  restoreStateCurrent,
  saveWindowState,
  StateFlags,
} from "@tauri-apps/plugin-window-state";

const appWindow = new Window("main");

export function initAppWindow() {
  restoreStateCurrent(StateFlags.ALL);
  setupAppWindowListener();
}

export function saveAppWindowState() {
  saveWindowState(StateFlags.ALL);
}

function setupAppWindowListener() {
  appWindow.listen("close-requested", async () => {
    saveAppWindowState();
    await appWindow.close();
  });
}

export default { initAppWindow, saveAppWindowState };
