// use super::error::{StoreError, StoreResult};
// use super::entity::AppStore;
use crate::misc::{
    config::get_global,
    error::{CoreError, CoreResult},
    utils::resolve_resource_path,
};
use log::{info, warn};
use serde::{de::DeserializeOwned, Serialize};
use std::{
    fs::{create_dir_all, File},
    io::{BufReader, BufWriter},
    marker::PhantomData,
    path::PathBuf,
};

// const STORE_FILENAME: &str = "store.json";

#[derive(Debug)]
pub struct StoreManager<T> {
    store_path: PathBuf,
    _phantom: PhantomData<T>,
}

impl<T> StoreManager<T>
where
    T: Serialize + DeserializeOwned + Default,
{
    pub fn new(path: String) -> CoreResult<Self> {
        let config = get_global();
        let store_path = resolve_resource_path(
            &PathBuf::from(
                // config
                //     .get("store.store_base")
                //     .and_then(|v| v.as_str().map(|s| s.to_string()))
                //     .unwrap(),
                config
                    .get("store_base")
                    .ok_or_else(|| {
                        CoreError::OtherError(
                            "missing 'store.store_base' key in Config".to_string(),
                        )
                    })?
                    .as_str()
                    .ok_or_else(|| {
                        CoreError::OtherError("`store.store_base` field not a string".to_string())
                    })?
                    .to_string(),
            ),
            path,
        )?;
        if let Some(parent) = store_path.parent() {
            create_dir_all(parent).map_err(|source| CoreError::FsError(source.to_string()))?;
        }
        Ok(Self {
            store_path,
            _phantom: PhantomData,
        })
    }

    pub fn load(&self) -> CoreResult<T> {
        if !self.store_path.exists() {
            warn!("{:?} does not exist", self.store_path);
            return Ok(T::default());
        }
        info!("Loading store from {:?}...", self.store_path);
        let file = File::open(&self.store_path)
            .map_err(|source| CoreError::FsError(source.to_string()))?;
        let reader = BufReader::new(file);
        let store =
            serde_json::from_reader(reader).map_err(|e| CoreError::FsError(e.to_string()))?;
        Ok(store)
    }

    pub fn save(&self, store: &T) -> CoreResult<()> {
        info!("Saving store to {:?}...", self.store_path);
        let file = File::create(&self.store_path)
            .map_err(|source| CoreError::FsError(source.to_string()))?;
        let writer = BufWriter::new(file);
        serde_json::to_writer_pretty(writer, store)
            .map_err(|e| CoreError::FsError(e.to_string()))?;
        Ok(())
    }
}
