use crate::{
    misc::error::{CoreError, CoreResult},
    store::json::{
        entity::{
            alist::{Aelement, Alist},
            list::Playlist,
        },
        op::sm::StoreManager,
    },
};
use std::{
    collections::HashSet,
    path::PathBuf,
    sync::{Arc, Mutex},
};

pub struct AlistOp {
    pub sm: Arc<Mutex<StoreManager<HashSet<Alist>>>>,
}

#[allow(unused)]
impl AlistOp {
    pub fn create(&self, name: String) -> CoreResult<()> {
        let mut alists = self.sm.lock().unwrap().load()?;
        let alist = Alist {
            name: name.clone(),
            elements: Vec::new(),
            created_at: chrono::Local::now().timestamp().to_string(),
        };
        if alists.insert(alist) {
            self.sm.lock().unwrap().save(&alists)?;
            Ok(())
        } else {
            Err(CoreError::OtherError(format!(
                "Alist with name {:?} already exists in the store",
                name
            )))
        }
    }

    pub fn list_all(&self) -> CoreResult<Vec<Alist>> {
        let alists = self.sm.lock().unwrap().load()?;
        let mut vec = alists.iter().cloned().collect::<Vec<_>>();
        vec.sort_by(|a, b| a.cmp(&b));
        Ok(vec)
    }

    pub fn insert(&self, alist: &Alist) -> CoreResult<()> {
        let mut alists = self.sm.lock().unwrap().load()?;
        if alists.insert(alist.clone()) {
            self.sm.lock().unwrap().save(&alists)?;
            Ok(())
        } else {
            Err(CoreError::OtherError(format!(
                "Alist with name {:?} already exists in the store",
                alist.name
            )))
        }
    }

    pub fn locate(&self, name: String) -> CoreResult<Alist> {
        let alists = self.sm.lock().unwrap().load()?;
        alists
            .into_iter()
            .find(|alist| alist.name == name)
            .ok_or_else(|| {
                CoreError::OtherError(format!("Alist with name {:?} not found in the store", name))
            })
    }

    pub fn rename(&self, old_name: String, new_name: String) -> CoreResult<()> {
        let mut alists = self.sm.lock().unwrap().load()?;
        if alists.iter().any(|alist| alist.name == new_name) {
            return Err(CoreError::OtherError(format!(
                "Alist with name {:?} already exists in the store",
                new_name
            )));
        }
        let mut alist = alists
            .take(&Alist {
                name: old_name.clone(),
                elements: Vec::new(),
                created_at: String::new(),
            })
            .ok_or_else(|| {
                CoreError::OtherError(format!(
                    "Alist with name {:?} not found in the store",
                    old_name
                ))
            })?;
        alist.name = new_name;
        alists.insert(alist);
        self.sm.lock().unwrap().save(&alists)?;
        Ok(())
    }

    pub fn modify(&self, alist: &Alist) -> CoreResult<()> {
        let mut alists = self.sm.lock().unwrap().load()?;
        if alists.remove(alist) {
            alists.insert(alist.clone());
            self.sm.lock().unwrap().save(&alists)?;
            Ok(())
        } else {
            Err(CoreError::OtherError(format!(
                "Alist with name {:?} not found in the store",
                alist.name
            )))
        }
    }

    pub fn remove(&self, name: String) -> CoreResult<()> {
        let mut alists = self.sm.lock().unwrap().load()?;
        let alist = Alist {
            name: name.clone(),
            elements: Vec::new(),
            created_at: String::new(),
        };
        if alists.remove(&alist) {
            self.sm.lock().unwrap().save(&alists)?;
            Ok(())
        } else {
            Err(CoreError::OtherError(format!(
                "Alist with name {:?} not found in the store",
                name
            )))
        }
    }

    pub fn remove_batch(&self, names: Vec<String>) -> CoreResult<()> {
        let mut alists = self.sm.lock().unwrap().load()?;
        names.iter().try_for_each(|name| {
            let alist = Alist {
                name: name.clone(),
                elements: Vec::new(),
                created_at: String::new(),
            };
            alists.remove(&alist).then_some(()).ok_or_else(|| {
                CoreError::OtherError(format!("Alist with name {:?} not found in the store", name))
            })
        })?;
        self.sm.lock().unwrap().save(&alists)?;
        Ok(())
    }

    pub fn add_element(&self, alist_name: String, element: Aelement) -> CoreResult<()> {
        let mut alists = self.sm.lock().unwrap().load()?;
        let mut alist = alists
            .take(&Alist {
                name: alist_name.clone(),
                elements: Vec::new(),
                created_at: String::new(),
            })
            .ok_or_else(|| {
                CoreError::OtherError(format!(
                    "Alist with name {:?} not found in the store",
                    alist_name
                ))
            })?;
        alist.elements.push(element);
        alists.insert(alist);
        self.sm.lock().unwrap().save(&alists)?;
        Ok(())
    }

    pub fn remove_element(&self, alist_name: String, index: usize) -> CoreResult<()> {
        let mut alists = self.sm.lock().unwrap().load()?;
        let mut alist = alists
            .take(&Alist {
                name: alist_name.clone(),
                elements: Vec::new(),
                created_at: String::new(),
            })
            .ok_or_else(|| {
                CoreError::OtherError(format!(
                    "Alist with name {:?} not found in the store",
                    alist_name
                ))
            })?;
        if index >= alist.elements.len() {
            return Err(CoreError::OtherError(format!(
                "Index {} out of bounds for alist {:?}",
                index, alist_name
            )));
        }
        alist.elements.remove(index);
        alists.insert(alist);
        self.sm.lock().unwrap().save(&alists)?;
        Ok(())
    }

    pub fn remove_elements(&self, alist_name: String, indices: Vec<usize>) -> CoreResult<()> {
        let mut alists = self.sm.lock().unwrap().load()?;
        let mut alist = alists
            .take(&Alist {
                name: alist_name.clone(),
                elements: Vec::new(),
                created_at: String::new(),
            })
            .ok_or_else(|| {
                CoreError::OtherError(format!(
                    "Alist with name {:?} not found in the store",
                    alist_name
                ))
            })?;
        let mut sorted_indices = indices;
        sorted_indices.sort_unstable_by(|a, b| b.cmp(a));
        sorted_indices.iter().try_for_each(|&index| {
            if index >= alist.elements.len() {
                return Err(CoreError::OtherError(format!(
                    "Index {} out of bounds for alist {:?}",
                    index, alist_name
                )));
            }
            alist.elements.remove(index);
            Ok(())
        })?;
        alists.insert(alist);
        self.sm.lock().unwrap().save(&alists)?;
        Ok(())
    }

    pub fn remove_element_all(&self, alist_name: String, element: Aelement) -> CoreResult<()> {
        let mut alists = self.sm.lock().unwrap().load()?;
        let mut alist = alists
            .take(&Alist {
                name: alist_name.clone(),
                elements: Vec::new(),
                created_at: String::new(),
            })
            .ok_or_else(|| {
                CoreError::OtherError(format!(
                    "Alist with name {:?} not found in the store",
                    alist_name
                ))
            })?;
        alist.elements.retain(|e| e != &element);
        alists.insert(alist);
        self.sm.lock().unwrap().save(&alists)?;
        Ok(())
    }

    pub fn remove_elements_all(
        &self,
        alist_name: String,
        elements: Vec<Aelement>,
    ) -> CoreResult<()> {
        let mut alists = self.sm.lock().unwrap().load()?;
        let mut alist = alists
            .take(&Alist {
                name: alist_name.clone(),
                elements: Vec::new(),
                created_at: String::new(),
            })
            .ok_or_else(|| {
                CoreError::OtherError(format!(
                    "Alist with name {:?} not found in the store",
                    alist_name
                ))
            })?;
        let element_set: HashSet<Aelement> = elements.into_iter().collect();
        alist.elements.retain(|e| !element_set.contains(e));
        alists.insert(alist);
        self.sm.lock().unwrap().save(&alists)?;
        Ok(())
    }

    pub fn clear(&self, alist_name: String) -> CoreResult<()> {
        let mut alists = self.sm.lock().unwrap().load()?;
        let mut alist = alists
            .take(&Alist {
                name: alist_name.clone(),
                elements: Vec::new(),
                created_at: String::new(),
            })
            .ok_or_else(|| {
                CoreError::OtherError(format!(
                    "Alist with name {:?} not found in the store",
                    alist_name
                ))
            })?;
        alist.elements.clear();
        alists.insert(alist);
        self.sm.lock().unwrap().save(&alists)?;
        Ok(())
    }

    pub fn clear_all(&self) -> CoreResult<()> {
        let alists = HashSet::new();
        self.sm.lock().unwrap().save(&alists)
    }

    pub fn list_all_songs(&self, alist_name: String) -> CoreResult<Vec<PathBuf>> {
        let alists = self.sm.lock().unwrap().load()?;
        let alist = alists
            .into_iter()
            .find(|alist| alist.name == alist_name)
            .ok_or_else(|| {
                CoreError::OtherError(format!(
                    "Alist with name {:?} not found in the store",
                    alist_name
                ))
            })?;
        let songs = alist
            .elements
            .into_iter()
            .filter_map(|element| match element {
                Aelement::Song(song) => Some(vec![song.path]),
                Aelement::Playlist(playlist) => Some(playlist.songs),
                Aelement::Release(release) => {
                    Some(release.songs.iter().map(|s| PathBuf::from(s)).collect())
                }
                Aelement::Artist(artist) => {
                    Some(artist.songs.iter().map(|s| PathBuf::from(s)).collect())
                }
                _ => None,
            })
            .flatten()
            .collect();
        Ok(songs)
    }

    pub fn list_all_elements(&self, alist_name: String) -> CoreResult<Vec<Aelement>> {
        let alists = self.sm.lock().unwrap().load()?;
        let alist = alists
            .into_iter()
            .find(|alist| alist.name == alist_name)
            .ok_or_else(|| {
                CoreError::OtherError(format!(
                    "Alist with name {:?} not found in the store",
                    alist_name
                ))
            })?;
        Ok(alist.elements)
    }

    // remove an alist and convert it to a playlist
    pub fn freeze(&self, alist_name: String) -> CoreResult<Playlist> {
        let mut alists = self.sm.lock().unwrap().load()?;
        // let alist = alists
        //     .into_iter()
        //     .find(|alist| alist.name == alist_name)
        //     .ok_or_else(|| {
        //         CoreError::OtherError(format!(
        //             "Alist with name {:?} not found in the store",
        //             alist_name
        //         ))
        //     })?;
        let alist = alists
            .take(&Alist {
                name: alist_name.clone(),
                elements: Vec::new(),
                created_at: String::new(),
            })
            .ok_or_else(|| {
                CoreError::OtherError(format!(
                    "Alist with name {:?} not found in the store",
                    alist_name
                ))
            })?;
        let playlist = Playlist {
            name: alist.name,
            songs: alist
                .elements
                .into_iter()
                .filter_map(|element| match element {
                    Aelement::Song(song) => Some(vec![song.path]),
                    Aelement::Playlist(playlist) => Some(playlist.songs),
                    Aelement::Release(release) => {
                        Some(release.songs.iter().map(|s| PathBuf::from(s)).collect())
                    }
                    Aelement::Artist(artist) => {
                        Some(artist.songs.iter().map(|s| PathBuf::from(s)).collect())
                    }
                    _ => None,
                })
                .flatten()
                .collect(),
            created_at: alist.created_at,
        };
        Ok(playlist)
    }
}
