
import { Release } from "@/types";


export function getReleaseRoute(release: Release): string {
  const title = release.title || "unknown";
  const artist = release.artist || "unknown";
  return `release/${encodeURIComponent(title)}/${encodeURIComponent(artist)}`;
}


export function parseReleaseFromRoute(
  titleParam: string | undefined,
  artistParam: string | undefined
): { title: string | null; artist: string | null } {
  const title =
    titleParam && titleParam !== "unknown"
      ? decodeURIComponent(titleParam)
      : null;
  const artist =
    artistParam && artistParam !== "unknown"
      ? decodeURIComponent(artistParam)
      : null;
  return { title, artist };
}


export function matchRelease(
  release: Release,
  title: string | null,
  artist: string | null
): boolean {
  const releaseTitle = release.title || null;
  const releaseArtist = release.artist || null;

  return releaseTitle === title && releaseArtist === artist;
}


export function getArtistRoute(artistName: string | null): string {
  const name = artistName || "Unknown Artist";
  return `/artist/${encodeURIComponent(name)}`;
}


export function parseArtistFromRoute(nameParam: string | undefined): string {
  if (!nameParam) return "Unknown Artist";
  const decoded = decodeURIComponent(nameParam);
  return decoded === "Unknown Artist" ? "" : decoded;
}
