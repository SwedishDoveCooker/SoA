use crate::{
    misc::error::{CoreError, CoreResult},
    store::json::{
        entity::{
            recent::{Recent, Recents},
            song::Song,
        },
        op::sm::StoreManager,
    },
};
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};

pub struct RecentOp {
    pub sm: Arc<Mutex<StoreManager<Recents>>>,
}

#[allow(unused)]
impl RecentOp {
    // optional wip: add new

    pub fn list_all(&self) -> CoreResult<Recents> {
        let recents = self.sm.lock().unwrap().load()?;
        Ok(recents)
    }

    pub fn clear(&self) -> CoreResult<()> {
        let recents = Recents::new();
        self.sm.lock().unwrap().save(&recents)?;
        Ok(())
    }

    pub fn add(&self, song: Song) -> CoreResult<()> {
        let recent = Recent::from_song(song);
        self.insert(&recent)
    }

    pub fn insert(&self, recent: &Recent) -> CoreResult<()> {
        let mut recents = self.sm.lock().unwrap().load()?;
        recents.insert(0, recent.clone());
        self.sm.lock().unwrap().save(&recents)?;
        Ok(())
    }

    pub fn remove_by_index(&self, index: usize) -> CoreResult<()> {
        let mut recents = self.sm.lock().unwrap().load()?;
        if index < recents.len() {
            recents.remove(index);
            self.sm.lock().unwrap().save(&recents)?;
            Ok(())
        } else {
            Err(CoreError::OtherError(format!(
                "Index {} out of bounds for recents of length {}",
                index,
                recents.len()
            )))
        }
    }

    pub fn remove_by_indexs(&self, indices: Vec<usize>) -> CoreResult<()> {
        let mut recents = self.sm.lock().unwrap().load()?;
        indices.iter().try_for_each(|&index| {
            if index < recents.len() {
                recents.remove(index);
                Ok(())
            } else {
                Err(CoreError::OtherError(format!(
                    "Index {} out of bounds for recents of length {}",
                    index,
                    recents.len()
                )))
            }
        });
        self.sm.lock().unwrap().save(&recents)?;
        Ok(())
    }

    pub fn remove_by_song_all(&self, song: Song) -> CoreResult<()> {
        let mut recents = self.sm.lock().unwrap().load()?;
        recents.retain(|recent| recent.song != song.path);
        self.sm.lock().unwrap().save(&recents)?;
        Ok(())
    }

    pub fn remove_by_songs_all(&self, songs: Vec<Song>) -> CoreResult<()> {
        let song_paths: Vec<_> = songs.iter().map(|s| s.path.clone()).collect();
        let mut recents = self.sm.lock().unwrap().load()?;
        recents.retain(|recent| !song_paths.contains(&recent.song));
        self.sm.lock().unwrap().save(&recents)?;
        Ok(())
    }

    pub fn remove_by_song_path(&self, song: &PathBuf) -> CoreResult<()> {
        let mut recents = self.sm.lock().unwrap().load()?;
        recents.retain(|recent| &recent.song != song);
        self.sm.lock().unwrap().save(&recents)?;
        Ok(())
    }

    pub fn remove_by_song_paths(&self, song_paths: Vec<&PathBuf>) -> CoreResult<()> {
        let mut recents = self.sm.lock().unwrap().load()?;
        recents.retain(|recent| !song_paths.contains(&&recent.song));
        self.sm.lock().unwrap().save(&recents)?;
        Ok(())
    }
}
