import React, { useState } from "react";
import {
  Box,
  Heading,
  Button,
  Avatar,
  Flex,
  IconButton,
} from "@radix-ui/themes";
import {
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { IconContext } from "react-icons";
import { FaPlay, FaPause } from "react-icons/fa6";
import { useMusic, Track, TrackScore } from "../hooks/useMusic";
import {
  GridApi,
  DataGrid,
  GridColDef,
  useGridApiRef,
  GridRenderCellParams,
  GridRenderEditCellParams,
  useGridApiContext,
} from "@mui/x-data-grid";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { formatDuration } from "../utils/format";

interface SongCellProps extends GridRenderCellParams<Track> {
  apiRef: React.RefObject<GridApi | null>;
}

const scoreOrder: { [key in TrackScore]: number } = {
  [TrackScore.SuperBigCupUp]: 9,
  [TrackScore.SuperBigCup]: 8,
  [TrackScore.SuperBigCupDown]: 7,
  [TrackScore.BigCupUp]: 6,
  [TrackScore.BigCup]: 5,
  [TrackScore.BigCupDown]: 4,
  [TrackScore.MedCupUp]: 3,
  [TrackScore.MedCup]: 2,
  [TrackScore.MedCupDown]: 1,
};

const scoreSortComparator = (v1?: TrackScore, v2?: TrackScore) => {
  const score1 = v1 ? scoreOrder[v1] : 0;
  const score2 = v2 ? scoreOrder[v2] : 0;
  return score1 - score2;
};

const SongCell: React.FC<SongCellProps> = ({ row, apiRef }) => {
  const { playTrack, togglePlayPause, currentTrack, isPlaying } = useMusic();
  const [isHovered, setIsHovered] = useState(false);

  const isCurrentTrack = currentTrack?.id === row.id;

  const handleIconClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    if (!apiRef.current) {
      return;
    }

    if (isCurrentTrack && isPlaying) {
      togglePlayPause();
    } else {
      const visibleRowIds = apiRef.current.getSortedRowIds();
      const visiblePlaylist = visibleRowIds.map(
        (id) => apiRef.current!.getRow(id) as Track
      );
      playTrack(row.id, visiblePlaylist);
    }
  };

  const IconToShow = isCurrentTrack && isPlaying ? FaPause : FaPlay;

  const isOverlayVisible = isHovered || (isCurrentTrack && isPlaying);

  return (
    <Flex
      gap="3"
      align="center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ width: "100%", height: "100%" }}
    >
      <Box className="datagrid-album-art-container">
        <Avatar
          src={row.art_b64 || undefined}
          fallback="?"
          radius="small"
          size="3"
        />
        {isOverlayVisible && (
          <IconButton
            variant="ghost"
            className="datagrid-play-button"
            onClick={handleIconClick}
          >
            <IconContext.Provider
              value={{ color: "white", className: "yang-zheng" }}
            >
              <IconToShow />
            </IconContext.Provider>
          </IconButton>
        )}
      </Box>
      <Flex direction="column">{row.title}</Flex>
    </Flex>
  );
};

export const ScoreCell: React.FC<
  GridRenderCellParams<Track, TrackScore | undefined>
> = ({ value }) => {
  if (!value) {
    return <></>;
  }
  return <>{value}</>;
};

const ScoreEditCell: React.FC<GridRenderEditCellParams<Track>> = (row) => {
  const apiRef = useGridApiContext();
  const { id, value, field } = row;

  const handleChange = (event: SelectChangeEvent<string>) => {
    const newValue = event.target.value;
    apiRef.current.setEditCellValue({ id, field, value: newValue || null });
  };

  return (
    <Box>
      <FormControl sx={{ m: 0.7, minWidth: 120 }} size="small">
        <InputLabel htmlFor="grouped-native-select">score</InputLabel>
        <Select
          native
          defaultValue={value || ""}
          id="grouped-native-select"
          onChange={handleChange}
          label="Score"
        >
          <option aria-label="None" value="" />
          <optgroup label="🤩 Super Big Cup Family">
            <option value={TrackScore.SuperBigCupUp}>🥹 Super Big Cup Up</option>
            <option value={TrackScore.SuperBigCup}>☺️ Super Big Cup</option>
            <option value={TrackScore.SuperBigCupDown}>
              😘 Super Big Cup Down
            </option>
          </optgroup>
          <optgroup label="😍 Big Cup Family">
            <option value={TrackScore.BigCupUp}>🌭 Big Cup Up</option>
            <option value={TrackScore.BigCup}>🍌 Big Cup</option>
            <option value={TrackScore.BigCupDown}>🥵 Big Cup Down</option>
          </optgroup>
          <optgroup label="😁 Medium Cup Family">
            <option value={TrackScore.MedCupUp}>🤨 Medium Cup Up</option>
            <option value={TrackScore.MedCup}>🤣 Medium Cup</option>
            <option value={TrackScore.MedCupDown}>🔥 Medium Cup Down</option>
          </optgroup>
          <optgroup label="🤔 No Score / Hard to Place">
            <option value="">
              <em>😅 no score</em>
            </option>
          </optgroup>
        </Select>
      </FormControl>
    </Box>
  );
};

const LibraryPage: React.FC = () => {
  const { playlist, setPlaylist, updateTrack } = useMusic();
  const apiRef = useGridApiRef();

  const handleScan = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected === "string") {
        await invoke("scan_dir", { directory: selected });
        const newTracks: Track[] = await invoke("get_all_tracks");
        setPlaylist(newTracks);
      }
    } catch (error) {
      console.error("Scan dir err: ", error);
    }
  };

  const processRowUpdate = React.useCallback(
    async (newRow: Track, oldRow: Track) => {
      if (JSON.stringify(newRow) !== JSON.stringify(oldRow)) {
        try {
          await updateTrack(newRow as Track);
          console.log("Track updated successfully:", newRow);
          return newRow;
        } catch (error) {
          console.error("Failed to update track, reverting:", error);
          return oldRow;
        }
      }
      return oldRow;
    },
    [updateTrack]
  );

  const columns: GridColDef<Track>[] = [
    {
      field: "title",
      headerName: "Song",
      editable: true,
      flex: 1,
      maxWidth: 114514,
      renderCell: (params) => <SongCell {...params} apiRef={apiRef} />,
    },
    {
      field: "artist_name",
      headerName: "Artist",
      editable: true,
      width: 150,
      valueGetter: (_, row) => row.artist_name,
    },
    {
      field: "release_name",
      headerName: "Release",
      editable: true,
      width: 170,
      valueGetter: (_, row) => row.release_name,
    },
    {
      field: "score",
      headerName: "Score",
      width: 260,
      editable: true,
      renderCell: (params) => <ScoreCell {...params} />,
      renderEditCell: (params) => <ScoreEditCell {...params} />,
      sortComparator: scoreSortComparator,
    },
    {
      field: "duration",
      headerName: "Time",
      width: 50,
      align: "right",
      headerAlign: "right",
      valueGetter: (_, row) => formatDuration(row.duration),
    },
  ];

  return (
    <Box p="6">
      <Flex justify="between" align="center" mb="4">
        <Heading size="8">Library</Heading>
        <Button
          variant="soft"
          radius="medium"
          color="blue"
          onClick={handleScan}
        >
          Scan Directory
        </Button>
      </Flex>
      <div className="library-grid-container">
        <Box style={{ flexGrow: 1, width: "100%", height: 580 }}>
          <DataGrid<Track>
            apiRef={apiRef}
            rows={playlist}
            columns={columns}
            getRowId={(row) => row.id}
            rowHeight={52}
            hideFooter
            processRowUpdate={processRowUpdate}
            sx={{
              border: "none",
              "& .MuiDataGrid-columnHeaders": {
                borderBottom: "1px solid var(--gray-a3)",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: "bold",
                color: "var(--gray-a10)",
                fontSize: "12px",
              },
              "& .MuiDataGrid-cell": {
                borderBottom: "0px solid var(--gray-a3)",
                alignItems: "center",
              },
              "& .MuiDataGrid-row": {
                "&:hover": {
                  backgroundColor: "var(--gray-a2)",
                },
              },
              "& .MuiDataGrid-virtualScroller": {
                "& .MuiDataGrid-row:last-child": {
                  "& .MuiDataGrid-cell": {
                    borderBottom: "none",
                  },
                },
              },
              "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-cell:focus-within":
                {
                  outline: "none !important",
                },
            }}
          />
        </Box>
      </div>
    </Box>
  );
};

export default LibraryPage;
