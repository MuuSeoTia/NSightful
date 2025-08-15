
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{command, State};
use std::sync::Arc;
use tokio::sync::Mutex;

mod nvml;

// Tauri command to get GPU telemetry data
#[command]
async fn get_gpu_telemetry() -> Result<String, String> {
    // This will be implemented to return real-time GPU data
    Ok(r#"{"status": "connected", "gpus": []}"#.to_string())
}

// Tauri command to start NVML streaming
#[command]
async fn start_nvml_stream(period_ms: u64) -> Result<String, String> {
    match nvml::nvml_stream(period_ms).await {
        Ok(_) => Ok("Stream started".to_string()),
        Err(e) => Err(format!("Failed to start stream: {}", e)),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_gpu_telemetry,
            start_nvml_stream
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
