
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{command, State, Manager, Window};
use std::sync::Arc;
use tokio::sync::{Mutex, broadcast};
use serde_json::json;

mod nvml;

// Global state for telemetry streaming
#[derive(Default)]
pub struct TelemetryState {
    pub is_streaming: Arc<Mutex<bool>>,
    pub sender: Arc<Mutex<Option<broadcast::Sender<nvml::TelemetryFrame>>>>,
}

// Tauri command to get GPU information and initial telemetry
#[command]
async fn get_gpu_telemetry() -> Result<String, String> {
    match nvml::get_gpu_info().await {
        Ok(gpu_info) => {
            let response = json!({
                "status": "connected",
                "gpus": gpu_info.devices,
                "telemetry": gpu_info.current_telemetry
            });
            Ok(response.to_string())
        }
        Err(e) => Err(format!("Failed to get GPU telemetry: {}", e)),
    }
}

// Tauri command to start NVML streaming
#[command]
async fn start_nvml_stream(
    period_ms: u64,
    state: State<'_, TelemetryState>,
    window: Window,
) -> Result<String, String> {
    let mut is_streaming = state.is_streaming.lock().await;
    
    if *is_streaming {
        return Ok("Stream already active".to_string());
    }

    *is_streaming = true;
    drop(is_streaming);

    // Create broadcast channel for telemetry data
    let (tx, _rx) = broadcast::channel(1000);
    {
        let mut sender_guard = state.sender.lock().await;
        *sender_guard = Some(tx.clone());
    }

    // Clone necessary data for the background task
    let is_streaming_clone = state.is_streaming.clone();
    let window_clone = window.clone();

    // Start background streaming task
    tokio::spawn(async move {
        if let Err(e) = nvml::nvml_stream_with_broadcast(period_ms, tx, is_streaming_clone, window_clone).await {
            eprintln!("NVML streaming error: {}", e);
        }
    });

    Ok("Stream started".to_string())
}

// Tauri command to stop NVML streaming
#[command]
async fn stop_nvml_stream(state: State<'_, TelemetryState>) -> Result<String, String> {
    let mut is_streaming = state.is_streaming.lock().await;
    *is_streaming = false;
    
    let mut sender_guard = state.sender.lock().await;
    *sender_guard = None;
    
    Ok("Stream stopped".to_string())
}

// Tauri command to get current streaming status
#[command]
async fn get_stream_status(state: State<'_, TelemetryState>) -> Result<String, String> {
    let is_streaming = state.is_streaming.lock().await;
    let response = json!({
        "streaming": *is_streaming
    });
    Ok(response.to_string())
}

// Tauri command to get GPU architecture information
#[command]
async fn get_gpu_architecture() -> Result<String, String> {
    match nvml::get_detailed_gpu_info().await {
        Ok(arch_info) => Ok(serde_json::to_string(&arch_info).unwrap()),
        Err(e) => Err(format!("Failed to get GPU architecture: {}", e)),
    }
}

fn main() {
    tauri::Builder::default()
        .manage(TelemetryState::default())
        .invoke_handler(tauri::generate_handler![
            get_gpu_telemetry,
            start_nvml_stream,
            stop_nvml_stream,
            get_stream_status,
            get_gpu_architecture
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
