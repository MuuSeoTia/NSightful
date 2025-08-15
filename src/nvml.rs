use anyhow::Result;
use nvml_wrapper::{Nvml, device::Device};
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};

// Structure for the telemetry stats
#[derive(Serialize)]
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
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis()
}

// function for detecting devices and listing them
pub fn list_devices(nvml: &Nvml) -> Result<Vec<Device>> {
    let count = nvml.device_count()?;
    (0..count).map(|i| nvml.device_by_index(i)).collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

//function for retrieving nvml data in real time
pub async fn nvml_stream(mut period_ms: u64) -> Result<()> {
    if period_ms < 50 {
        period_ms = 50;
    }

    let nvml = Nvml::init()?;
    let devices = list_devices(&nvml)?;

    loop {
        for (i, d) in devices.iter().enumerate() {
            let util = d.utilization()?;
            let name = d.name()?;
            let temp = d.temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu)?;
            let clocks = (d.clock_info(nvml_wrapper::enum_wrappers::device::Clock::Sm)?,
                          d.clock_info(nvml_wrapper::enum_wrappers::device::Clock::Mem)?);
            let mem = d.memory_info()?;
            let power = d.power_usage().unwrap_or(0.0) / 1000.0; // Convert mW to W
            let frame = TelemetryFrame {
                ts_ms: now_ms(),
                index: i as u32,
                name,
                util_gpu: util.gpu,
                util_mem: util.memory,
                mem_used_mb: (mem.used / (1024 * 1024)) as u64,
                mem_total_mb: (mem.total / (1024 * 1024)) as u64,
                sm_clock_mhz: clocks.0,
                mem_clock_mhz: clocks.1,
                temperature_c: temp,
                power_w: power,
            };
            println!("{}", serde_json::to_string(&frame)?);
        }
        tokio::time::sleep(std::time::Duration::from_millis(period_ms)).await;
    }
    
}

