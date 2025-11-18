use crate::{
    misc::error::CoreResult,
    store::json::{entity::song::Song, op::pic::PicOp},
};
use log::info;

pub struct PicController {
    op: PicOp,
}

#[allow(unused)]
impl PicController {
    pub fn new() -> Self {
        let op = PicOp {};
        info!("PicController initialized");
        Self { op }
    }

    pub fn get_op(&self) -> &PicOp {
        &self.op
    }

    pub fn get_release_art(&self, song: &Song) -> CoreResult<bool> {
        self.op.get_song_pic(song)
    }

    pub fn get_release_arts(
        &self,
        songs: &Vec<Song>,
        // app: &tauri::AppHandle,
    ) -> CoreResult<Vec<bool>> {
        self.op.get_song_pics(songs)
    }
}
