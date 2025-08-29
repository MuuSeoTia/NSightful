//! NSightful GPU Visualizer - Desktop Application Backend
//! 
//! Tauri-based desktop application providing real-time GPU monitoring
//! and visualization capabilities through NVML integration.

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{command, State, Window};
use std::sync::Arc;
use tokio::sync::{Mutex, broadcast};
use serde_json::json;

mod nvml;

/// Global application state for telemetry streaming
/// 
/// Manages the lifecycle and communication channels for real-time
/// GPU telemetry data streaming to the frontend.
#[derive(Default)]
pub struct TelemetryState {
    pub is_streaming: Arc<Mutex<bool>>,
    pub sender: Arc<Mutex<Option<broadcast::Sender<nvml::TelemetryFrame>>>>,
}

/// Tauri command to retrieve GPU information and initial telemetry
/// 
/// Provides comprehensive GPU device information along with current
/// performance metrics for frontend initialization.
/// 
/// # Returns
/// * `Result<String, String>` - JSON response with GPU data or error message
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

/// Tauri command to start real-time NVML streaming
/// 
/// Initiates background telemetry collection and streaming to the frontend.
/// Creates broadcast channels for data distribution and manages streaming lifecycle.
/// 
/// # Arguments
/// * `period_ms` - Update interval in milliseconds
/// * `state` - Application telemetry state
/// * `window` - Tauri window handle for events
/// 
/// # Returns
/// * `Result<String, String>` - Success message or error
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

/// Tauri command to stop NVML streaming
/// 
/// Gracefully shuts down telemetry streaming and cleans up resources.
/// 
/// # Arguments
/// * `state` - Application telemetry state
/// 
/// # Returns
/// * `Result<String, String>` - Success message or error
#[command]
async fn stop_nvml_stream(state: State<'_, TelemetryState>) -> Result<String, String> {
    let mut is_streaming = state.is_streaming.lock().await;
    *is_streaming = false;
    
    let mut sender_guard = state.sender.lock().await;
    *sender_guard = None;
    
    Ok("Stream stopped".to_string())
}

/// Tauri command to get current streaming status
/// 
/// Returns the current state of telemetry streaming for frontend status updates.
/// 
/// # Arguments
/// * `state` - Application telemetry state
/// 
/// # Returns
/// * `Result<String, String>` - JSON status response or error
#[command]
async fn get_stream_status(state: State<'_, TelemetryState>) -> Result<String, String> {
    let is_streaming = state.is_streaming.lock().await;
    let response = json!({
        "streaming": *is_streaming
    });
    Ok(response.to_string())
}

/// Tauri command to get detailed GPU architecture information
/// 
/// Provides comprehensive hardware architecture details including
/// core counts, memory specifications, and performance characteristics.
/// 
/// # Returns
/// * `Result<String, String>` - JSON architecture data or error message
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

#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;
    
    #[tokio::test]
    async fn test_get_gpu_architecture_command() {
        // Test that the command returns properly formatted JSON
        let result = get_gpu_architecture().await;
        
        match result {
            Ok(json_str) => {
                // Should be valid JSON
                let parsed: Result<serde_json::Value, _> = serde_json::from_str(&json_str);
                assert!(parsed.is_ok(), "GPU architecture should return valid JSON");
            }
            Err(e) => {
                // Error is acceptable if no GPU is available
                assert!(e.contains("GPU"), "Error should mention GPU: {}", e);
            }
        }
    }
    
    #[tokio::test]
    async fn test_get_gpu_telemetry_command() {
        let result = get_gpu_telemetry().await;
        
        match result {
            Ok(json_str) => {
                // Should be valid JSON with expected structure
                let parsed: Result<serde_json::Value, _> = serde_json::from_str(&json_str);
                assert!(parsed.is_ok(), "GPU telemetry should return valid JSON");
                
                let data = parsed.unwrap();
                assert!(data.get("status").is_some(), "Should have status field");
            }
            Err(e) => {
                // Error is acceptable if no GPU is available
                assert!(e.contains("GPU") || e.contains("NVML"), "Error should mention GPU or NVML: {}", e);
            }
        }
    }
    
    #[test]
    fn test_telemetry_state_default() {
        let state = TelemetryState::default();
        // State should initialize properly
        assert!(state.is_streaming.try_lock().is_ok());
        assert!(state.sender.try_lock().is_ok());
    }
    
    #[tokio::test]
    async fn test_get_stream_status_command() {
        let state = TelemetryState::default();
        let result = get_stream_status(tauri::State::from(&state)).await;
        
        assert!(result.is_ok(), "Stream status should always succeed");
        
        let json_str = result.unwrap();
        let parsed: Result<serde_json::Value, _> = serde_json::from_str(&json_str);
        assert!(parsed.is_ok(), "Stream status should return valid JSON");
        
        let data = parsed.unwrap();
        assert!(data.get("streaming").is_some(), "Should have streaming field");
    }
}
