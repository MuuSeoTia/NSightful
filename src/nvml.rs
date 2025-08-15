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
pub fn device_list(nvml : &Nvml) -> Result<Vec<Device>> {
    count = nvml.device_count()?;

    (0..count).map(|i nvml.device_by_index(i)).collect(Result<Vec<_>,_>>().map_err(Into::into));
}

//function for retrieving nvml data in real time
pub async fn nvml_stream(mut period_ms: u64) -> Result <()> {
    if period_ms < 50 {
        period_ms = 50;
    }

    let nvml = Nvml::init()?;
    let devices = list_devices(&Nvml)?;

    loop {
        for(i,d) in devices.iter().enumerate() {
            let util = d.utilization()?;
            let name = d.name()?;
            let temp = d.temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu)?;
            let clocks = (d.clock_info(nvml_wrapper::enum_wrappers::device::Clock::Sm)?,
                          d.clock_info(nvml_wrapper::enum_wrappers::device::Clock::Mem)?);
            let tf = TelemetryFrame {
            ts_ms = clocks;
            index = i;
            name = &self.name;
            }
        }
        
    }
    
}

