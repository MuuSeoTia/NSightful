use anyhow::Result;
use nvml_wrapper::{Nvml, device::Device};
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use std::sync::Arc;
use tokio::sync::{Mutex, broadcast};
use tauri::Window;

// Structure for the telemetry stats
#[derive(Serialize, Clone, Debug)]
pub struct TelemetryFrame {
    pub timestamp: u128,
    pub device_index: u32,
    pub name: String,
    pub util_gpu: u32,      
    pub util_memory: u32,      
    pub memory_used_mb: u64,
    pub memory_total_mb: u64,
    pub sm_clock_mhz: u32,
    pub memory_clock_mhz: u32,
    pub temperature_c: u32,
    pub power_w: f32,
    pub fan_speed_percent: u32,
    pub sm_utilizations: Vec<f32>, // Per-SM utilization if available
    pub memory_bandwidth_gbps: f32,
    pub pcie_utilization: u32,
}

// Structure for GPU device information
#[derive(Serialize, Clone, Debug)]
pub struct GPUDevice {
    pub index: u32,
    pub name: String,
    pub uuid: String,
    pub pci_info: String,
    pub memory_total_mb: u64,
    pub compute_capability: String,
    pub sm_count: u32,
    pub cores_per_sm: u32,
    pub max_threads_per_sm: u32,
    pub warp_size: u32,
    pub l2_cache_size_mb: u32,
    pub memory_bus_width: u32,
    pub base_clock_mhz: u32,
    pub boost_clock_mhz: u32,
}

// Structure for GPU info response
#[derive(Serialize)]
pub struct GPUInfo {
    pub devices: Vec<GPUDevice>,
    pub current_telemetry: Option<TelemetryFrame>,
}

// Structure for detailed GPU architecture info
#[derive(Serialize)]
pub struct GPUArchitecture {
    pub name: String,
    pub compute_capability: String,
    pub sm_count: u32,
    pub cores_per_sm: u32,
    pub tensor_cores_per_sm: u32,
    pub rt_cores_per_sm: u32,
    pub memory_total_gb: f32,
    pub memory_bus_width: u32,
    pub memory_type: String,
    pub l1_cache_size_kb: u32,
    pub l2_cache_size_mb: u32,
    pub max_threads_per_sm: u32,
    pub max_threads_per_block: u32,
    pub warp_size: u32,
    pub base_clock_mhz: u32,
    pub boost_clock_mhz: u32,
    pub memory_clock_mhz: u32,
    pub max_power_w: f32,
    pub thermal_design_power_w: f32,
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

// Get comprehensive GPU information
pub async fn get_gpu_info() -> Result<GPUInfo> {
    let nvml = Nvml::init()?;
    let devices = list_devices(&nvml)?;
    
    let mut gpu_devices = Vec::new();
    let mut current_telemetry = None;
    
    for (index, device) in devices.iter().enumerate() {
        let gpu_device = create_gpu_device_info(device, index as u32)?;
        gpu_devices.push(gpu_device);
        
        // Get current telemetry for the first device
        if index == 0 {
            current_telemetry = Some(collect_telemetry_frame(device, index as u32)?);
        }
    }
    
    Ok(GPUInfo {
        devices: gpu_devices,
        current_telemetry,
    })
}

// Create detailed GPU device information
fn create_gpu_device_info(device: &Device, index: u32) -> Result<GPUDevice> {
    let name = device.name()?;
    let uuid = device.uuid()?.to_string();
    let pci_info = format!("{}", device.pci_info()?);
    let memory_info = device.memory_info()?;
    let memory_total_mb = (memory_info.total / (1024 * 1024)) as u64;
    
    // Get compute capability
    let compute_capability = format!("{}.{}", 
        device.cuda_compute_capability()?.major,
        device.cuda_compute_capability()?.minor
    );
    
    // Get clock information
    let sm_clock = device.max_clock_info(nvml_wrapper::enum_wrappers::device::Clock::Sm).unwrap_or(0);
    let memory_clock = device.max_clock_info(nvml_wrapper::enum_wrappers::device::Clock::Mem).unwrap_or(0);
    
    // Estimate cores based on GPU name (this is approximate)
    let (sm_count, cores_per_sm) = estimate_gpu_specs(&name);
    
    Ok(GPUDevice {
        index,
        name,
        uuid,
        pci_info,
        memory_total_mb,
        compute_capability,
        sm_count,
        cores_per_sm,
        max_threads_per_sm: 1536, // Typical for modern GPUs
        warp_size: 32,
        l2_cache_size_mb: estimate_l2_cache(&name),
        memory_bus_width: estimate_memory_bus_width(&name),
        base_clock_mhz: (sm_clock as f32 * 0.8) as u32, // Estimate base clock
        boost_clock_mhz: sm_clock,
    })
}

// Estimate GPU specifications based on name
fn estimate_gpu_specs(name: &str) -> (u32, u32) {
    // This is a simplified estimation - in a real app you'd have a database
    if name.contains("RTX 4090") {
        (128, 128) // 128 SMs, 128 cores per SM
    } else if name.contains("RTX 4080") {
        (76, 128)
    } else if name.contains("RTX 4070") {
        (46, 128)
    } else if name.contains("RTX 3090") {
        (82, 128)
    } else if name.contains("RTX 3080") {
        (68, 128)
    } else if name.contains("RTX 3070") {
        (46, 128)
    } else if name.contains("GTX") {
        (20, 128) // Generic estimate for older GTX cards
    } else {
        (32, 128) // Generic fallback
    }
}

// Estimate L2 cache size based on GPU name
fn estimate_l2_cache(&name: &str) -> u32 {
    if name.contains("RTX 40") {
        72 // 72MB for RTX 40 series
    } else if name.contains("RTX 30") {
        6 // 6MB for RTX 30 series
    } else {
        4 // Generic fallback
    }
}

// Estimate memory bus width
fn estimate_memory_bus_width(name: &str) -> u32 {
    if name.contains("RTX 4090") {
        384
    } else if name.contains("RTX 4080") {
        256
    } else if name.contains("RTX 4070") {
        192
    } else if name.contains("RTX 30") {
        320
    } else {
        256 // Generic fallback
    }
}

// Get detailed GPU architecture information
pub async fn get_detailed_gpu_info() -> Result<GPUArchitecture> {
    let nvml = Nvml::init()?;
    let devices = list_devices(&nvml)?;
    
    if devices.is_empty() {
        return Err(anyhow::anyhow!("No GPU devices found"));
    }
    
    let device = &devices[0]; // Use first device
    let name = device.name()?;
    let memory_info = device.memory_info()?;
    let compute_capability = device.cuda_compute_capability()?;
    
    let (sm_count, cores_per_sm) = estimate_gpu_specs(&name);
    let (tensor_cores, rt_cores) = estimate_specialized_cores(&name);
    
    Ok(GPUArchitecture {
        name: name.clone(),
        compute_capability: format!("{}.{}", compute_capability.major, compute_capability.minor),
        sm_count,
        cores_per_sm,
        tensor_cores_per_sm: tensor_cores,
        rt_cores_per_sm: rt_cores,
        memory_total_gb: (memory_info.total as f32) / (1024.0 * 1024.0 * 1024.0),
        memory_bus_width: estimate_memory_bus_width(&name),
        memory_type: estimate_memory_type(&name),
        l1_cache_size_kb: 128, // Typical L1 cache size
        l2_cache_size_mb: estimate_l2_cache(&name),
        max_threads_per_sm: 1536,
        max_threads_per_block: 1024,
        warp_size: 32,
        base_clock_mhz: device.max_clock_info(nvml_wrapper::enum_wrappers::device::Clock::Sm).unwrap_or(1400),
        boost_clock_mhz: device.max_clock_info(nvml_wrapper::enum_wrappers::device::Clock::Sm).unwrap_or(1700),
        memory_clock_mhz: device.max_clock_info(nvml_wrapper::enum_wrappers::device::Clock::Mem).unwrap_or(7000),
        max_power_w: device.power_management_limit_default().unwrap_or(350000) as f32 / 1000.0,
        thermal_design_power_w: device.power_management_limit_default().unwrap_or(350000) as f32 / 1000.0,
    })
}

// Estimate specialized cores based on GPU generation
fn estimate_specialized_cores(name: &str) -> (u32, u32) {
    if name.contains("RTX 40") {
        (4, 2) // 4 tensor cores, 2 RT cores per SM for Ada Lovelace
    } else if name.contains("RTX 30") {
        (4, 1) // 4 tensor cores, 1 RT core per SM for Ampere
    } else if name.contains("RTX 20") {
        (1, 1) // 1 tensor core, 1 RT core per SM for Turing
    } else {
        (0, 0) // No specialized cores for older architectures
    }
}

// Estimate memory type based on GPU generation
fn estimate_memory_type(name: &str) -> String {
    if name.contains("RTX 40") {
        "GDDR6X".to_string()
    } else if name.contains("RTX 30") {
        "GDDR6X".to_string()
    } else if name.contains("RTX 20") {
        "GDDR6".to_string()
    } else {
        "GDDR5".to_string()
    }
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
                timestamp: now_ms(),
                device_index: i as u32,
                name,
                util_gpu: util.gpu,
                util_memory: util.memory,
                memory_used_mb: (mem.used / (1024 * 1024)) as u64,
                memory_total_mb: (mem.total / (1024 * 1024)) as u64,
                sm_clock_mhz: clocks.0,
                memory_clock_mhz: clocks.1,
                temperature_c: temp,
                power_w: power,
                fan_speed_percent: d.fan_speed(0).unwrap_or(0),
                sm_utilizations: vec![util.gpu as f32 / 100.0; 32], // Simplified
                memory_bandwidth_gbps: estimate_memory_bandwidth(&name, util.memory),
                pcie_utilization: ((util.gpu + util.memory) as f32 * 0.3) as u32,
            };
            println!("{}", serde_json::to_string(&frame)?);
        }
        tokio::time::sleep(std::time::Duration::from_millis(period_ms)).await;
    }
    
}

// Enhanced streaming function with broadcast channel
pub async fn nvml_stream_with_broadcast(
    mut period_ms: u64,
    sender: broadcast::Sender<TelemetryFrame>,
    is_streaming: Arc<Mutex<bool>>,
    window: Window,
) -> Result<()> {
    if period_ms < 50 {
        period_ms = 50;
    }

    let nvml = Nvml::init()?;
    let devices = list_devices(&nvml)?;

    println!("Started NVML streaming with {} devices", devices.len());

    loop {
        // Check if we should continue streaming
        {
            let streaming = is_streaming.lock().await;
            if !*streaming {
                println!("NVML streaming stopped");
                break;
            }
        }

        // Collect telemetry from all devices
        for (i, device) in devices.iter().enumerate() {
            let util = device.utilization()?;
            let name = device.name()?;
            let temp = device.temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu)?;
            let clocks = (device.clock_info(nvml_wrapper::enum_wrappers::device::Clock::Sm)?,
                          device.clock_info(nvml_wrapper::enum_wrappers::device::Clock::Mem)?);
            let mem = device.memory_info()?;
            let power = device.power_usage().unwrap_or(0.0) / 1000.0;
            
            let frame = TelemetryFrame {
                timestamp: now_ms(),
                device_index: i as u32,
                name: name.clone(),
                util_gpu: util.gpu,
                util_memory: util.memory,
                memory_used_mb: (mem.used / (1024 * 1024)) as u64,
                memory_total_mb: (mem.total / (1024 * 1024)) as u64,
                sm_clock_mhz: clocks.0,
                memory_clock_mhz: clocks.1,
                temperature_c: temp,
                power_w: power,
                fan_speed_percent: device.fan_speed(0).unwrap_or(0),
                sm_utilizations: generate_sm_utilizations(util.gpu, estimate_gpu_specs(&name).0),
                memory_bandwidth_gbps: estimate_memory_bandwidth(&name, util.memory),
                pcie_utilization: ((util.gpu + util.memory) as f32 * 0.3) as u32,
            };
            
            // Send to broadcast channel
            if let Err(_) = sender.send(frame.clone()) {
                // No receivers, but continue
            }
            
            // Send to frontend via Tauri event
            if let Err(e) = window.emit("telemetry-update", &frame) {
                eprintln!("Failed to emit telemetry event: {}", e);
            }
        }

        tokio::time::sleep(std::time::Duration::from_millis(period_ms)).await;
    }
    
    Ok(())
}

// Generate per-SM utilization data (simulated)
fn generate_sm_utilizations(overall_util: u32, sm_count: u32) -> Vec<f32> {
    let mut utilizations = Vec::with_capacity(sm_count as usize);
    let base_util = overall_util as f32 / 100.0;
    
    for i in 0..sm_count {
        // Add some variance to make it realistic using a deterministic pattern
        let variance = (i as f32 * 0.1).sin() * 0.2 + ((i * 17) % 100) as f32 / 500.0 - 0.1;
        let sm_util = (base_util + variance).max(0.0).min(1.0);
        utilizations.push(sm_util);
    }
    
    utilizations
}

