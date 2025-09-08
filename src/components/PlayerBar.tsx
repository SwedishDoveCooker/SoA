import { Flex, Box, Text, IconButton, Avatar, Slider } from "@radix-ui/themes";
import { FaPlay } from "react-icons/fa6";
import { GiPauseButton } from "react-icons/gi";
import { IoPlayBack, IoPlayForward } from "react-icons/io5";
import {
  SpeakerLoudIcon,
  SpeakerQuietIcon,
  SpeakerOffIcon,
} from "@radix-ui/react-icons";
import { useMusic } from "../hooks/useMusic";
import React, { useState, useEffect } from "react";
import { PiShuffleBold } from "react-icons/pi";
import { TbRepeat, TbRepeatOnce } from "react-icons/tb";
import { IconContext } from "react-icons";

import { styled } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import MuiSlider from "@mui/material/Slider";
import MuiBox from "@mui/material/Box";

interface MusicPlayerSliderProps {
  hide: boolean;
}

const MusicPlayerSlider = ({ hide }: MusicPlayerSliderProps) => {
  const { progress, duration, seek } = useMusic();

  const [sliderPosition, setSliderPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      setSliderPosition(progress);
    }
  }, [progress, isDragging]);

  const handleSliderChange = (_: Event, value: number | number[]) => {
    if (!isDragging) setIsDragging(true);
    setSliderPosition(value as number);
  };

  const handleSliderChangeCommitted = (
    _: React.SyntheticEvent | Event,
    value: number | number[]
  ) => {
    seek(value as number);
    setIsDragging(false);
  };

  // 没有人会注意播放时长小数点后的误差 但所有人都会在意他们的播放时长和剩余时长不同步
  const duration_fix = Math.floor(duration);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <MuiBox sx={{ width: "100%", overflow: "hidden" }}>
      <MuiBox
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: -2.5,
          opacity: hide ? 1 : 0,
        }}
      >
        <TinyText>{formatTime(sliderPosition)}</TinyText>
        <TinyText>-{formatTime(duration_fix - sliderPosition)}</TinyText>
      </MuiBox>
      <MuiSlider
        aria-label="time-indicator"
        size="small"
        value={sliderPosition}
        min={0}
        step={1}
        max={duration_fix || 114514}
        onChange={handleSliderChange}
        onChangeCommitted={handleSliderChangeCommitted}
        sx={{
          mb: -2.2,
          color: "var(--gray-12)",
          height: 4,
          "& .MuiSlider-thumb": {
            width: 8,
            height: 8,
            transition: "0.3s cubic-bezier(.47,1.64,.41,.8)",
            opacity: hide ? 1 : 0,
            "&::before": {
              boxShadow: "0 2px 12px 0 rgba(0,0,0,0.4)",
            },
            "&:hover, &.Mui-focusVisible": {
              boxShadow: `0px 0px 0px 8px rgb(0 0 0 / 0%)`,
            },
          },
          "& .MuiSlider-rail": {
            opacity: 0.28,
          },
        }}
      />
    </MuiBox>
  );
};

const TinyText = styled(Typography)({
  fontSize: "0.75rem",
  opacity: 0.5,
  fontWeight: 500,
  letterSpacing: 0.2,
});

const PlayerBar: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    volume,
    isShuffled,
    repeatMode,
    togglePlayPause,
    playNext,
    playPrev,
    setVolume,
    toggleShuffle,
    cycleRepeatMode,
  } = useMusic();

  const [isHovering, setIsHovering] = useState(false);
  const activeColor = "red";
  const inactiveColor = "var(--gray-9)";

  const getVolumeIcon = () => {
    if (volume === 0) return <SpeakerOffIcon />;
    if (volume < 0.3) return <SpeakerQuietIcon />;
    return <SpeakerLoudIcon />;
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  if (!currentTrack) {
    return (
      <Flex align="center" justify="center" height="100%" px="4">
        <Text color="gray">no current track</Text>
      </Flex>
    );
  }

  return (
    <Flex
      align="center"
      justify="between"
      px="7"
      gap="7"
      className="player-bar-root"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Flex
        align="center"
        gap="3"
        pr="0"
        justify="start"
        style={{ flex: "1 1 200px" }}
      >
        <IconContext.Provider
          value={{
            color: isShuffled ? activeColor : inactiveColor,
            size: "20",
          }}
        >
          <IconButton variant="ghost" color="gray" onClick={toggleShuffle}>
            <PiShuffleBold />
          </IconButton>
        </IconContext.Provider>
        <IconButton
          variant="ghost"
          color="gray"
          size="3"
          radius="medium"
          onClick={playPrev}
        >
          <IoPlayBack size={24} />
        </IconButton>
        <IconButton
          variant="ghost"
          color="mint"
          radius="medium"
          size="4"
          onClick={togglePlayPause}
        >
          {isPlaying ? <GiPauseButton size={28} /> : <FaPlay size={28} />}
        </IconButton>
        <IconButton
          variant="ghost"
          color="gray"
          size="3"
          radius="medium"
          onClick={playNext}
        >
          <IoPlayForward size={24} />
        </IconButton>
        <IconContext.Provider
          value={{
            color: repeatMode !== "none" ? activeColor : inactiveColor,
            size: "20",
          }}
        >
          <IconButton variant="ghost" color="gray" onClick={cycleRepeatMode}>
            {repeatMode === "one" ? <TbRepeatOnce /> : <TbRepeat />}
          </IconButton>
        </IconContext.Provider>
      </Flex>

      <Flex
        align="center"
        justify="center"
        style={{ flex: "2 1 400px", minWidth: 350 }}
      >
        <Box className="player-info-box">
          <Avatar
            src={currentTrack.art_b64 || undefined}
            fallback="?"
            className="player-info-album-art"
            radius="small"
          />

          <Flex
            direction="column"
            justify="center"
            className="player-info-text"
          >
            <Text size="2" weight="bold" trim="end">
              {currentTrack.title}
            </Text>
            <Text size="1" color="gray" trim="end">
              {currentTrack.artist_name || ""}
            </Text>
          </Flex>

          <Box className="player-progress-bar">
            {/* <Slider
              value={[progress]}
              onValueChange={(v) => seek(v[0])}
              max={duration || 100}
            /> */}
            <MusicPlayerSlider hide={isHovering} />
          </Box>
        </Box>
      </Flex>

      <Flex align="center" gap="3" justify="end" style={{ flex: "1 1 200px" }}>
        {getVolumeIcon()}
        <Slider
          value={[volume * 100]}
          onValueChange={(v) => handleVolumeChange([v[0] / 100])}
          max={100}
          style={{ width: "100px" }}
        />
      </Flex>
    </Flex>
  );
};

export default PlayerBar;
