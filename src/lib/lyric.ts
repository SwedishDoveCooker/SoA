

import {
  parseLrc,
  parseYrc,
  parseQrc,
  parseLys,
  parseEslrc,
  parseTTML,
  decryptQrcHex,
  type LyricLine,
  type TTMLLyric,
} from "@applemusic-like-lyrics/lyric";


export type LyricFormat =
  | "LRC"
  | "YRC"
  | "QRC"
  | "QRC_HEX"
  | "LYS"
  | "ESLRC"
  | "TTML";


export interface ParsedLyricResult {
  lines: LyricLine[];
  metadata?: TTMLLyric["metadata"];
}


export async function parseLyrics(
  lyricContent: string,
  format: LyricFormat
): Promise<ParsedLyricResult | null> {
  if (!lyricContent) {
    return null;
  }

  try {
    let parsedLines: LyricLine[] = [];
    let ttmlMetadata: TTMLLyric["metadata"] | undefined = undefined;

    switch (format) {
      case "LRC":
        parsedLines = parseLrc(lyricContent);
        break;
      case "YRC":
        parsedLines = parseYrc(lyricContent);
        break;
      case "QRC_HEX": {
        const decryptedQrc = decryptQrcHex(lyricContent);
        parsedLines = parseQrc(decryptedQrc);
        break;
      }
      case "QRC":
        parsedLines = parseQrc(lyricContent);
        break;
      case "LYS":
        parsedLines = parseLys(lyricContent);
        break;
      case "ESLRC":
        parsedLines = parseEslrc(lyricContent);
        break;
      case "TTML": {
        const ttmlLyric: TTMLLyric = parseTTML(lyricContent);
        parsedLines = ttmlLyric.lines;
        ttmlMetadata = ttmlLyric.metadata;
        break;
      }
      default:
        console.warn(
          `[LyricProcessor] Unknown or unsupported lyric format: ${format}`
        );
        return null;
    }

    return {
      lines: parsedLines,
      metadata: ttmlMetadata,
    };
  } catch (error) {
    console.error(`[LyricProcessor] Failed to parse ${format} lyrics:`, error);
    return null;
  }
}


