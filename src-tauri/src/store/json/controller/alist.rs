use crate::{
    misc::{
        config::get_global,
        error::{CoreError, CoreResult},
    },
    store::json::{
        entity::{
            alist::{Aelement, Alist},
            list::Playlist,
        },
        op::{alist::AlistOp, sm::StoreManager},
    },
};
use log::info;
use std::{
    collections::HashSet,
    path::PathBuf,
    sync::{Arc, Mutex},
};

#[derive(Clone)]
pub struct AlistController {
    pub op: Arc<AlistOp>,
}

#[allow(unused)]
impl AlistController {
    pub fn new() -> CoreResult<Self> {
        let config = get_global();
        let op = Arc::new(AlistOp {
            sm: Arc::new(Mutex::new(StoreManager::<HashSet<Alist>>::new(
                config
                    .get("alist_store")
                    .ok_or_else(|| {
                        CoreError::OtherError(
                            "missing 'store.alist_store' key in Config".to_string(),
                        )
                    })?
                    .as_str()
                    .ok_or_else(|| {
                        CoreError::OtherError("`store.alist_store` field not a string".to_string())
                    })?
                    .to_string(),
            )?)),
        });
        info!("AlistController initialized");
        Ok(Self { op })
    }

    pub fn get_op(&self) -> Arc<AlistOp> {
        self.op.clone()
    }

    pub fn get_all_alists(&self) -> CoreResult<Vec<Alist>> {
        self.op.list_all()
    }

    pub fn get_alist(&self, name: String) -> CoreResult<Alist> {
        self.op.locate(name)
    }

    pub fn get_alists(&self, names: Vec<String>) -> CoreResult<Vec<Alist>> {
        let alists = names
            .into_iter()
            .map(|name| self.op.locate(name))
            .collect::<CoreResult<Vec<Alist>>>()?;
        Ok(alists)
    }

    pub fn add(&self, alist: &Alist) -> CoreResult<()> {
        self.op.insert(alist)
    }

    pub fn create_alist(&self, name: String) -> CoreResult<()> {
        self.op.create(name)
    }

    pub fn rename(&self, old_name: String, new_name: String) -> CoreResult<()> {
        self.op.rename(old_name, new_name)
    }

    pub fn add_element(&self, alist_name: String, element: Aelement) -> CoreResult<()> {
        self.op.add_element(alist_name, element)
    }

    pub fn remove_element(&self, alist_name: String, index: usize) -> CoreResult<()> {
        self.op.remove_element(alist_name, index)
    }

    pub fn remove_elements(&self, alist_name: String, indices: Vec<usize>) -> CoreResult<()> {
        self.op.remove_elements(alist_name, indices)
    }

    pub fn remove_element_all(&self, alist_name: String, element: Aelement) -> CoreResult<()> {
        self.op.remove_element_all(alist_name, element)
    }

    pub fn remove_elements_all(
        &self,
        alist_name: String,
        elements: Vec<Aelement>,
    ) -> CoreResult<()> {
        self.op.remove_elements_all(alist_name, elements)
    }

    pub fn clear_elements(&self, alist_name: String) -> CoreResult<()> {
        self.op.clear(alist_name)
    }

    pub fn clear_elements_multi(&self, alist_names: Vec<String>) -> CoreResult<()> {
        alist_names
            .into_iter()
            .try_for_each(|name| self.op.clear(name))?;
        Ok(())
    }

    pub fn del(&self, name: String) -> CoreResult<()> {
        self.op.remove(name)
    }

    pub fn del_batch(&self, names: Vec<String>) -> CoreResult<()> {
        self.op.remove_batch(names)
    }

    pub fn list_all_songs(&self, name: String) -> CoreResult<Vec<PathBuf>> {
        self.op.list_all_songs(name)
    }

    pub fn list_all_elements(&self, name: String) -> CoreResult<Vec<Aelement>> {
        self.op.list_all_elements(name)
    }

    pub fn freeze(&self, name: String) -> CoreResult<Playlist> {
        self.op.freeze(name)
    }
}
