use crate::misc::error::{CoreError, CoreResult};
use anyhow::Context;
use kira::{
    manager::{backend::cpal::CpalBackend, AudioManager},
    sound::{
        streaming::{StreamingSoundData, StreamingSoundHandle, StreamingSoundSettings},
        FromFileError, PlaybackState,
    },
    tween::Tween,
};
use log::{debug, warn};
use serde::Serialize;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackStatePayload {
    pub state: String,
}
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackTrackLoadedPayload {
    pub duration: f64,
    pub path: PathBuf,
}
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackProgressPayload {
    pub current_time: f64,
}
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackEndedPayload {
    pub path: PathBuf,
}

#[derive(Debug, PartialEq, Clone, Copy)]
enum InternalState {
    Playing,
    Paused,
    Stopped,
}

pub struct PlaybackService {
    app: AppHandle,
    audio_manager: Arc<Mutex<AudioManager<CpalBackend>>>,
    sound_handle: Arc<Mutex<Option<StreamingSoundHandle<FromFileError>>>>,
    state: Arc<Mutex<InternalState>>,
    current_path: Arc<Mutex<Option<PathBuf>>>,
}

impl PlaybackService {
    pub fn new(
        app: AppHandle,
        audio_manager: AudioManager<CpalBackend>,
    ) -> CoreResult<Arc<Mutex<Self>>> {
        Ok(Arc::new(Mutex::new(Self {
            app,
            audio_manager: Arc::new(Mutex::new(audio_manager)),
            sound_handle: Arc::new(Mutex::new(None)),
            state: Arc::new(Mutex::new(InternalState::Stopped)),
            current_path: Arc::new(Mutex::new(None)),
        })))
    }

    pub fn play_file(&mut self, path: PathBuf) -> CoreResult<()> {
        debug!("PlaybackService: play_file: {:?}", &path);

        self.stop_internal();

        let sound_data = StreamingSoundData::from_file(&path, StreamingSoundSettings::default())
            .with_context(|| format!("Failed to load sound from file: {:?}", &path))
            .map_err(|e| CoreError::OtherError(e.to_string()))?;

        let duration_sec = sound_data.duration().as_secs_f64();

        let handle = self
            .audio_manager
            .lock()
            .unwrap()
            .play(sound_data)
            .map_err(|e| CoreError::OtherError(format!("Failed to play sound: {e}")))?;

        *self.sound_handle.lock().unwrap() = Some(handle);
        *self.current_path.lock().unwrap() = Some(path.clone());
        self.set_state(InternalState::Playing);

        self.app
            .emit(
                "playback-track-loaded",
                PlaybackTrackLoadedPayload {
                    duration: duration_sec,
                    path: path.clone(),
                },
            )
            .map_err(CoreError::TauriError)?;

        Ok(())
    }

    pub fn play(&mut self) {
        debug!("PlaybackService: play (resume)");
        let resumed = {
            if let Some(handle) = self.sound_handle.lock().unwrap().as_mut() {
                handle.resume(Tween::default()).ok();
                true
            } else {
                false
            }
        };
        if resumed {
            self.set_state(InternalState::Playing);
        }
    }

    pub fn pause(&mut self) {
        debug!("PlaybackService: pause");
        {
            if let Some(handle) = self.sound_handle.lock().unwrap().as_mut() {
                handle.pause(Tween::default()).ok();
            }
        }
        self.set_state(InternalState::Paused);
    }

    pub fn stop(&mut self) {
        debug!("PlaybackService: stop");
        self.stop_internal();
        self.set_state(InternalState::Stopped);
    }

    fn stop_internal(&mut self) {
        if let Some(mut handle) = self.sound_handle.lock().unwrap().take() {
            handle.stop(Tween::default()).ok();
        }
        *self.current_path.lock().unwrap() = None;
    }

    pub fn seek(&mut self, position_seconds: f32) -> CoreResult<()> {
        debug!("PlaybackService: seek to {position_seconds}");
        if let Some(handle) = self.sound_handle.lock().unwrap().as_mut() {
            handle
                .seek_to(position_seconds as f64)
                .map_err(|e| CoreError::OtherError(format!("Failed to seek: {e}")))?;
        }
        Ok(())
    }

    pub fn set_volume(&mut self, volume: f32) {
        debug!("PlaybackService: set_volume to {volume}");
        if let Some(handle) = self.sound_handle.lock().unwrap().as_mut() {
            handle.set_volume(volume as f64, Tween::default()).ok();
        }
    }

    fn set_state(&mut self, new_state: InternalState) {
        let mut state_guard = self.state.lock().unwrap();
        if *state_guard == new_state {
            return;
        }
        *state_guard = new_state;

        let state_str = match new_state {
            InternalState::Playing => "playing",
            InternalState::Paused => "paused",
            InternalState::Stopped => "stopped",
        };

        let _ = self.app.emit(
            "playback-state-changed",
            PlaybackStatePayload {
                state: state_str.to_string(),
            },
        );
    }
}

pub fn spawn_progress_emitter(service: Arc<Mutex<PlaybackService>>, app: AppHandle) {
    let state_clone = service.lock().unwrap().state.clone();
    let sound_handle_clone = service.lock().unwrap().sound_handle.clone();
    let current_path_clone = service.lock().unwrap().current_path.clone();

    thread::spawn(move || loop {
        thread::sleep(Duration::from_millis(100));

        let mut current_time_to_emit: Option<f64> = None;
        let mut track_ended_path: Option<PathBuf> = None;
        let mut new_state_to_emit: Option<InternalState> = None;

        let state = *state_clone.lock().unwrap();

        if state == InternalState::Playing {
            if let Some(handle) = sound_handle_clone.lock().unwrap().as_ref() {
                current_time_to_emit = Some(handle.position());
                match handle.state() {
                    PlaybackState::Stopped | PlaybackState::Stopping => {
                        warn!("Playback Emitter: SoundHandle stopped, track finished.");

                        let mut state_guard = state_clone.lock().unwrap();
                        if *state_guard == InternalState::Playing {
                            *state_guard = InternalState::Stopped;
                            new_state_to_emit = Some(InternalState::Stopped);

                            track_ended_path = current_path_clone.lock().unwrap().take();
                        }
                    }
                    _ => {}
                }
            } else {
                warn!("Playback Emitter: State is Playing but no SoundHandle!");
                *state_clone.lock().unwrap() = InternalState::Stopped;
                new_state_to_emit = Some(InternalState::Stopped);
            }
        }

        if let Some(time) = current_time_to_emit {
            let _ = app.emit(
                "playback-progress",
                PlaybackProgressPayload { current_time: time },
            );
        }

        if let Some(path) = track_ended_path {
            let _ = app.emit("playback-ended", PlaybackEndedPayload { path });
        }

        if let Some(_state) = new_state_to_emit {
            let _ = app.emit(
                "playback-state-changed",
                PlaybackStatePayload {
                    state: "stopped".to_string(),
                },
            );
        }
    });
}
