use crate::logging::store;
use tauri::App;

pub fn setup(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    crate::logging::setup_logging(app.handle(), store).unwrap();
}
