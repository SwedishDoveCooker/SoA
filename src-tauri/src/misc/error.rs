use serde::{Serialize, Serializer};
use thiserror::Error;

#[non_exhaustive]
#[derive(Debug, Error)]
pub enum CoreError {
    // #[error(transparent)]
    // SqlxError(#[from] sqlx::Error),
    #[error(transparent)]
    LoftyError(#[from] lofty::error::LoftyError),

    #[error(transparent)]
    GlobError(#[from] glob::PatternError),

    #[error("IO Error: {0}")]
    IoError(#[from] std::io::Error),

    // #[error("Tokio join error: {0}")]
    // TokioJoinError(#[from] tokio::task::JoinError),
    #[error("Tauri error: {0}")]
    TauriError(#[from] tauri::Error),

    #[error("Notify error: {0}")]
    NotifyError(#[from] notify::Error),

    #[error("Recv error: {0}")]
    RecvError(#[from] std::sync::mpsc::RecvError),

    #[error("Fs error: {0}")]
    FsError(String),

    #[error("Other error: {0}")]
    OtherError(String),
}

pub type CoreResult<T> = Result<T, CoreError>;

impl Serialize for CoreError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
