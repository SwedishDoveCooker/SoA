use crate::{
    misc::{
        error::{CoreError, CoreResult},
        utils::get_time,
    },
    store::json::entity::{score::Score, song::Song},
};
use lofty::{
    config::{ParseOptions, WriteOptions},
    file::AudioFile,
    picture::{MimeType, Picture, PictureType},
    prelude::{ItemKey, TaggedFileExt},
    probe::Probe,
    tag::{Accessor, ItemValue, TagItem},
};
use log::warn;
use std::{fs, path::PathBuf};

#[allow(unused)]
impl Song {
    pub fn from_path(path: &PathBuf, score: Option<Score>) -> CoreResult<Self> {
        // Use custom parse options to be more lenient with invalid metadata
        let parse_options = ParseOptions::new()
            .read_properties(true)
            .parsing_mode(lofty::config::ParsingMode::Relaxed);

        let tagged_file = match Probe::open(&path) {
            Ok(probe) => match probe.options(parse_options).read() {
                Ok(file) => file,
                Err(e) => {
                    // If reading fails, try to get basic info without tags
                    warn!(
                        "Failed to read tags from {:?}: {:?}. Attempting to get basic info.",
                        path, e
                    );
                    return Err(CoreError::LoftyError(e));
                }
            },
            Err(e) => {
                warn!("Failed to open file {:?}: {:?}", path, e);
                return Err(CoreError::LoftyError(e));
            }
        };

        let tag = tagged_file.primary_tag();
        let properties = tagged_file.properties();

        // wip: make use of cow
        let title = tag.and_then(|t| t.title().map(|s| s.to_string()));
        let duration = Some(properties.duration().as_secs() as u32);
        let artist = tag.and_then(|t| t.artist().map(|s| s.to_string()));
        let release = tag.and_then(|t| t.album().map(|s| s.to_string()));
        let (created_at, updated_at) = get_time(path);

        let score_from_tag = if let Some(t) = tag {
            t.get_string(&ItemKey::Comment)
                .and_then(|s| serde_json::from_str::<Score>(s).ok())
        } else {
            None
        };

        Ok(Song {
            path: path.into(),
            title,
            artist,
            duration,
            release,
            created_at,
            updated_at,
            score: score.or(score_from_tag),
        })
    }

    pub fn write_tags(&self, new_cover_path: Option<&PathBuf>) -> CoreResult<()> {
        let mut tagged_file = Probe::open(&self.path)?.read()?;

        let tag_type = tagged_file.primary_tag_type();
        let tag = tagged_file.tag_mut(tag_type).ok_or_else(|| {
            CoreError::OtherError(format!("Failed to get mutable tag for {:?}", &self.path))
        })?;

        if let Some(title) = &self.title {
            tag.set_title(title.clone());
        } else {
            tag.remove_title();
        }
        if let Some(artist) = &self.artist {
            tag.set_artist(artist.clone());
        } else {
            tag.remove_artist();
        }
        if let Some(release) = &self.release {
            tag.set_album(release.clone());
        } else {
            tag.remove_album();
        }

        if let Some(score) = &self.score {
            let score_str = serde_json::to_string(score)
                .map_err(|e| CoreError::OtherError(format!("Failed to serialize score: {}", e)))?;
            tag.insert(TagItem::new(ItemKey::Comment, ItemValue::Text(score_str)));
        } else {
            tag.remove_key(&ItemKey::Comment);
        }

        if let Some(path) = new_cover_path {
            warn!("Setting new cover from path: {:?}", path);
            let picture_data = fs::read(path)?;
            let mime_type = match path.extension().and_then(|s| s.to_str()) {
                Some("jpg") | Some("jpeg") => MimeType::Jpeg,
                Some("png") => MimeType::Png,
                _ => MimeType::Unknown("".to_string()),
            };

            if mime_type == MimeType::Unknown("".to_string()) {
                warn!("Could not determine MIME type from extension, lofty will guess.");
            }

            let picture = Picture::new_unchecked(
                PictureType::CoverFront,
                Some(mime_type),
                None,
                picture_data,
            );

            (0..tag.picture_count()).for_each(|i| {
                tag.remove_picture(i.try_into().unwrap());
            });
            tag.push_picture(picture);
        }

        tagged_file
            .save_to_path(&self.path, WriteOptions::default())
            .map_err(|e| CoreError::LoftyError(e))?;

        Ok(())
    }
}
