use anyhow::Result;
use nvml_wrapper::{Nvml, device::Device};
use serde::Serialize

use std::time::{SystemTime, UNIX_EPOCH}

// Strucuture for the telemetry stats
pub struct TelemetryFrame {
    ts_ms: u128,
    index: u32,
    name: String,
    util_gpu: u32,      
    util_mem: u32,      
    mem_used_mb: u64,
    mem_total_mb: u64,
    sm_clock_mhz: u32,
    mem_clock_mhz: u32,
    temperature_c: u32,
    power_w: f32,
}

// function for detecting current ms
fn now_ms() -> u128 {
    SystemTime::now.duration_since(UNIX_EPOCH).unwrap().as_millis()
}

// function for detecting devices and listing them
pub fn list(nvml : &Nvml) -> Result<Vec<Device>> {
    count = nvml.device_count()?;

    (0..count).map(|i nvml.device_by_index(i)).collect(Result<Vec<_>,_>>().map_err(Into::into));
}

