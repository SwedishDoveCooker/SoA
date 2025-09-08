import { Box } from "@radix-ui/themes";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import PlayerBar from "./components/PlayerBar";
import LibraryPage from "./view/Library";
import React from "react";

const App: React.FC = () => {
  return (
    <div className="app-grid">
      <Box gridColumn="1" gridRow="1 / 3" className="sidebar">
        <Sidebar />
      </Box>

      <Box gridColumn="2" gridRow="1" className="main-content">
        <Routes>
          <Route path="/" element={<LibraryPage />} />
          <Route
            path="/artists"
            element={
              <div>
                <h1>WIP</h1>
              </div>
            }
          />
          <Route
            path="/releases"
            element={
              <div>
                <h1>WIP</h1>
              </div>
            }
          />
          <Route
            path="/playlists"
            element={
              <div>
                <h1>WIP</h1>
              </div>
            }
          />
        </Routes>
      </Box>

      <Box gridColumn="2" gridRow="2" className="player-bar">
        <PlayerBar />
      </Box>
    </div>
  );
};

export default App;
