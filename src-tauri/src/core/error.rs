use serde::{Serialize, Serializer};
use thiserror::Error;

// #[derive(Debug, Error)]
// pub enum CoreError {
//     #[error("File not found: {0}")]
//     NotFoundError(#[from] std::io::Error),

//     #[error("Failed to parse audio file: {0}")]
//     ParseError(#[from] lofty::error::LoftyError),
// }

#[non_exhaustive]
#[derive(Debug, Error)]
pub(crate) enum CoreError {
    #[error(transparent)]
    SqlxError(#[from] sqlx::Error),

    #[error(transparent)]
    LoftyError(#[from] lofty::error::LoftyError),

    #[error(transparent)]
    GlobError(#[from] glob::PatternError),

    #[error("IO Error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Tokio join error: {0}")]
    TokioJoinError(#[from] tokio::task::JoinError),

    #[error("Tauri error: {0}")]
    TauriError(#[from] tauri::Error),
}

pub type CoreResult<T> = std::result::Result<T, CoreError>;

impl Serialize for CoreError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
