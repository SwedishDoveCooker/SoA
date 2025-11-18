
import { Routes, Route, Navigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import {
  lyricSizePresetAtom,
  LyricSizePreset,
} from "@applemusic-like-lyrics/react-full";
import { RootLayout } from "@/components/layout/RootLayout";
import { SongsPage } from "@/pages/SongsPage";
import { ReleasesPage } from "@/pages/ReleasesPage";
import { ArtistsPage } from "@/pages/ArtistsPage";
import { PlaylistsPage } from "@/pages/PlaylistsPage";
import { AlistsPage } from "@/pages/AlistsPage";
import { RecentsPage } from "@/pages/RecentsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ScorePage } from "@/pages/ScorePage";
import { ArtistDetailPage } from "@/pages/ArtistDetailPage";
import { ReleaseDetailPage } from "@/pages/ReleaseDetailPage";
import { PlaylistDetailPage } from "@/pages/PlaylistDetailPage";
import { AlistDetailPage } from "@/pages/AlistDetailPage";
import { LibraryLoader } from "@/LibraryLoader";
import { Toaster } from "@/components/ui/sonner";
import {
  useFrontendConfig,
  useStartPage,
  useIsConfigLoading,
} from "@/hooks/useFrontendConfig";
import { useWindowAlwaysOnTop } from "@/hooks/useWindowAlwaysOnTop";
import { usePlayKeyShortcut } from "@/hooks/usePlayKeyShortcut";
import { useLocation, useNavigate } from "react-router-dom";

function StartPageRedirect() {
  const startPage = useStartPage();
  const isLoading = useIsConfigLoading();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log(
      "[StartPageRedirect] isLoading:",
      isLoading,
      "startPage:",
      startPage,
      "current path:",
      location.pathname
    );

    if (!isLoading && location.pathname === "/") {
      console.log("[StartPageRedirect] Redirecting to:", `/${startPage}`);
      navigate(`/${startPage}`, { replace: true });
    }
  }, [isLoading, startPage, location.pathname, navigate]);

  if (isLoading) {
    return null;
  }

  return <Navigate to={`/${startPage}`} replace />;
}

export default function App() {
  const lyricSize = useAtomValue(lyricSizePresetAtom);
  const { config } = useFrontendConfig();

  useWindowAlwaysOnTop(config.pinToTop);

  usePlayKeyShortcut(config.playKey, config.nextKey, config.prevKey);

  useEffect(() => {
    let fontSizeFormula = "";
    switch (lyricSize) {
      case LyricSizePreset.Tiny:
        fontSizeFormula = "max(max(2.5vh, 1.25vw), 10px)";
        break;
      case LyricSizePreset.ExtraSmall:
        fontSizeFormula = "max(max(3vh, 1.5vw), 10px)";
        break;
      case LyricSizePreset.Small:
        fontSizeFormula = "max(max(4vh, 2vw), 12px)";
        break;
      case LyricSizePreset.Large:
        fontSizeFormula = "max(max(6vh, 3vw), 16px)";
        break;
      case LyricSizePreset.ExtraLarge:
        fontSizeFormula = "max(max(7vh, 3.5vw), 18px)";
        break;
      case LyricSizePreset.Huge:
        fontSizeFormula = "max(max(8vh, 4vw), 20px)";
        break;
      default:
        fontSizeFormula = "max(max(5vh, 2.5vw), 14px)";
        break;
    }

    const styleId = "amll-font-size-style";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `
      .amll-lyric-player {
        font-size: ${fontSizeFormula} !important;
      }
    `;
  }, [lyricSize]);

  return (
    <LibraryLoader>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<StartPageRedirect />} />
          <Route path="songs" element={<SongsPage />} />
          <Route path="releases" element={<ReleasesPage />} />
          <Route path="artists" element={<ArtistsPage />} />
          <Route path="playlists" element={<PlaylistsPage />} />
          <Route path="alists" element={<AlistsPage />} />
          <Route path="recents" element={<RecentsPage />} />
          <Route path="score" element={<ScorePage />} />
          <Route path="settings" element={<SettingsPage />} />

          {}
          <Route path="artist/:name" element={<ArtistDetailPage />} />
          <Route
            path="release/:title/:artist"
            element={<ReleaseDetailPage />}
          />

          {}
          <Route path="playlist/:name" element={<PlaylistDetailPage />} />
          <Route path="alist/:name" element={<AlistDetailPage />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" />
    </LibraryLoader>
  );
}
