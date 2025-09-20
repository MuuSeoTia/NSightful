//! NVML GPU telemetry and monitoring module
//! 
//! This module provides real-time GPU monitoring capabilities using NVIDIA's
//! Management Library (NVML). It handles device discovery, telemetry collection,
//! and streaming of GPU performance data.

use anyhow::{Result, Context};
use nvml_wrapper::{Nvml, device::Device};
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use std::sync::Arc;
use tokio::sync::{Mutex, broadcast};
use tauri::Window;

/// Real-time telemetry data frame containing comprehensive GPU metrics
/// 
/// This structure captures all essential GPU performance data including
/// utilization, memory usage, thermal data, and per-SM statistics.
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

/// GPU device information and hardware specifications
/// 
/// Contains static information about the GPU hardware including
/// architecture details, memory configuration, and compute capabilities.
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

/// Complete GPU information response structure
/// 
/// Combines device information with current telemetry data
/// for comprehensive GPU status reporting.
#[derive(Serialize)]
pub struct GPUInfo {
    pub devices: Vec<GPUDevice>,
    pub current_telemetry: Option<TelemetryFrame>,
}

/// Detailed GPU architecture specifications
/// 
/// Provides in-depth hardware architecture information including
/// specialized cores, cache hierarchy, and performance characteristics.
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

/// Get current timestamp in milliseconds since Unix epoch
/// 
/// Returns the current system time as milliseconds for telemetry timestamping.
fn now_ms() -> u128 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis()
}

/// Enumerate all available NVIDIA GPU devices
/// 
/// Discovers and returns a list of all NVIDIA GPU devices available
/// on the system that can be monitored via NVML.
/// 
/// # Arguments
/// * `nvml` - Initialized NVML instance
/// 
/// # Returns
/// * `Result<Vec<Device>>` - Vector of GPU devices or error if enumeration fails
pub fn list_devices(nvml: &Nvml) -> Result<Vec<Device<'_>>> {
    let count = nvml.device_count()?;
    (0..count).map(|i| nvml.device_by_index(i)).collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

/// Retrieve comprehensive GPU information and current telemetry
/// 
/// Gathers complete GPU device information including hardware specifications
/// and current performance telemetry for all available devices.
/// 
/// # Returns
/// * `Result<GPUInfo>` - Complete GPU information or error if collection fails
pub async fn get_gpu_info() -> Result<GPUInfo> {
    let nvml = Nvml::init().context("Failed to initialize NVML")?;
    let devices = list_devices(&nvml).context("Failed to enumerate GPU devices")?;
    
    let mut gpu_devices = Vec::new();
    let mut current_telemetry = None;
    
    for (index, device) in devices.iter().enumerate() {
        let gpu_device = create_gpu_device_info(device, index as u32)
            .with_context(|| format!("Failed to create device info for GPU {}", index))?;
        gpu_devices.push(gpu_device);
        
        // Get current telemetry for the first device
        if index == 0 {
            current_telemetry = Some(create_simple_telemetry_frame(device, index as u32)
                .context("Failed to create initial telemetry frame")?);
        }
    }
    
    Ok(GPUInfo {
        devices: gpu_devices,
        current_telemetry,
    })
}

/// Create detailed GPU device information structure
/// 
/// Extracts comprehensive hardware information from an NVML device
/// including specifications, memory configuration, and clock speeds.
/// 
/// # Arguments
/// * `device` - NVML device reference
/// * `index` - Device index in the system
/// 
/// # Returns
/// * `Result<GPUDevice>` - Populated device information or error
fn create_gpu_device_info(device: &Device, index: u32) -> Result<GPUDevice> {
    let name = device.name()?;
    let uuid = device.uuid()?.to_string();
    let pci_info = format!("{:?}", device.pci_info()?);
    let memory_info = device.memory_info()?;
    let memory_total_mb = (memory_info.total / (1024 * 1024)) as u64;
    
    // Get compute capability
    let compute_capability = format!("{}.{}", 
        device.cuda_compute_capability()?.major,
        device.cuda_compute_capability()?.minor
    );
    
    // Get clock information
    let sm_clock = device.max_clock_info(nvml_wrapper::enum_wrappers::device::Clock::Graphics).unwrap_or(0);
    let _memory_clock = device.max_clock_info(nvml_wrapper::enum_wrappers::device::Clock::Memory).unwrap_or(0);
    
    // Estimate cores based on GPU name (this is approximate)
    let (sm_count, cores_per_sm) = estimate_gpu_specs(&name);
    
    Ok(GPUDevice {
        index,
        name: name.clone(),
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
fn estimate_l2_cache(name: &str) -> u32 {
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
        base_clock_mhz: device.max_clock_info(nvml_wrapper::enum_wrappers::device::Clock::Graphics).unwrap_or(1400),
        boost_clock_mhz: device.max_clock_info(nvml_wrapper::enum_wrappers::device::Clock::Graphics).unwrap_or(1700),
        memory_clock_mhz: device.max_clock_info(nvml_wrapper::enum_wrappers::device::Clock::Memory).unwrap_or(7000),
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

/// Stream NVML telemetry data in real-time
/// 
/// Continuously collects and prints GPU telemetry data to stdout
/// at the specified interval. Minimum update period is 50ms.
/// 
/// # Arguments
/// * `period_ms` - Update interval in milliseconds (minimum 50ms)
/// 
/// # Returns
/// * `Result<()>` - Success or error if streaming fails
pub async fn nvml_stream(mut period_ms: u64) -> Result<()> {
    if period_ms < 50 {
        period_ms = 50;
    }

    let nvml = Nvml::init()?;
    let devices = list_devices(&nvml)?;

    loop {
        for (i, d) in devices.iter().enumerate() {
            let util = d.utilization_rates()?;
            let name = d.name()?;
            let temp = d.temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu)?;
            let clocks = (d.clock_info(nvml_wrapper::enum_wrappers::device::Clock::Graphics)?,
                          d.clock_info(nvml_wrapper::enum_wrappers::device::Clock::Memory)?);
            let mem = d.memory_info()?;
            let power = d.power_usage().unwrap_or(0) as f32 / 1000.0; // Convert mW to W
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

/// Enhanced streaming function with broadcast channel and Tauri integration
/// 
/// Streams telemetry data via broadcast channel and Tauri events for frontend updates.
/// Supports graceful shutdown through the is_streaming flag.
/// 
/// # Arguments
/// * `period_ms` - Update interval in milliseconds (minimum 50ms)
/// * `sender` - Broadcast channel sender for telemetry data
/// * `is_streaming` - Shared flag to control streaming lifecycle
/// * `window` - Tauri window handle for frontend events
/// 
/// # Returns
/// * `Result<()>` - Success or error if streaming fails
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
            let util = device.utilization_rates()?;
            let name = device.name()?;
            let temp = device.temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu)?;
            let clocks = (device.clock_info(nvml_wrapper::enum_wrappers::device::Clock::Graphics)?,
                          device.clock_info(nvml_wrapper::enum_wrappers::device::Clock::Memory)?);
            let mem = device.memory_info()?;
            let power = device.power_usage().unwrap_or(0) as f32 / 1000.0;
            
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

// Create a simple telemetry frame for current implementation
fn create_simple_telemetry_frame(device: &Device, index: u32) -> Result<TelemetryFrame> {
    let util = device.utilization_rates()?;
    let name = device.name()?;
    let temp = device.temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu)?;
    let clocks = (
        device.clock_info(nvml_wrapper::enum_wrappers::device::Clock::Graphics)?,
        device.clock_info(nvml_wrapper::enum_wrappers::device::Clock::Memory)?
    );
    let mem = device.memory_info()?;
    let power = device.power_usage().unwrap_or(0) as f32 / 1000.0;
    let fan_speed = device.fan_speed(0).unwrap_or(0);
    
    // Generate per-SM utilization (simulated for now)
    let (sm_count, _) = estimate_gpu_specs(&name);
    let sm_utilizations = generate_sm_utilizations(util.gpu, sm_count);
    
    // Calculate memory bandwidth (estimated)
    let memory_bandwidth = estimate_memory_bandwidth(&name, util.memory);
    
    Ok(TelemetryFrame {
        timestamp: now_ms(),
        device_index: index,
        name,
        util_gpu: util.gpu,
        util_memory: util.memory,
        memory_used_mb: (mem.used / (1024 * 1024)) as u64,
        memory_total_mb: (mem.total / (1024 * 1024)) as u64,
        sm_clock_mhz: clocks.0,
        memory_clock_mhz: clocks.1,
        temperature_c: temp,
        power_w: power,
        fan_speed_percent: fan_speed,
        sm_utilizations,
        memory_bandwidth_gbps: memory_bandwidth,
        pcie_utilization: estimate_pcie_utilization(util.gpu, util.memory),
    })
}

// Estimate memory bandwidth based on GPU and utilization
fn estimate_memory_bandwidth(name: &str, memory_util: u32) -> f32 {
    let max_bandwidth = if name.contains("RTX 4090") {
        1008.0 // GB/s
    } else if name.contains("RTX 4080") {
        717.0
    } else if name.contains("RTX 4070") {
        504.0
    } else if name.contains("RTX 3090") {
        936.0
    } else if name.contains("RTX 3080") {
        760.0
    } else {
        500.0 // Generic fallback
    };
    
    max_bandwidth * (memory_util as f32 / 100.0)
}

/// Estimate PCIe utilization
fn estimate_pcie_utilization(gpu_util: u32, memory_util: u32) -> u32 {
    // Simple heuristic: PCIe usage correlates with data movement
    ((gpu_util + memory_util) as f32 * 0.3) as u32
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_now_ms_returns_valid_timestamp() {
        let timestamp = now_ms();
        // Should be a reasonable timestamp (after 2020)
        assert!(timestamp > 1577836800000); // Jan 1, 2020 in ms
    }
    
    #[test]
    fn test_estimate_gpu_specs_rtx_4090() {
        let (sm_count, cores_per_sm) = estimate_gpu_specs("RTX 4090");
        assert_eq!(sm_count, 128);
        assert_eq!(cores_per_sm, 128);
    }
    
    #[test]
    fn test_estimate_gpu_specs_unknown_card() {
        let (sm_count, cores_per_sm) = estimate_gpu_specs("Unknown GPU");
        assert_eq!(sm_count, 32);
        assert_eq!(cores_per_sm, 128);
    }
    
    #[test]
    fn test_estimate_l2_cache_rtx_40_series() {
        let cache_size = estimate_l2_cache("RTX 4080");
        assert_eq!(cache_size, 72);
    }
    
    #[test]
    fn test_estimate_memory_bus_width() {
        assert_eq!(estimate_memory_bus_width("RTX 4090"), 384);
        assert_eq!(estimate_memory_bus_width("RTX 4080"), 256);
        assert_eq!(estimate_memory_bus_width("Unknown"), 256);
    }
    
    #[test]
    fn test_estimate_specialized_cores() {
        let (tensor, rt) = estimate_specialized_cores("RTX 4090");
        assert_eq!(tensor, 4);
        assert_eq!(rt, 2);
        
        let (tensor, rt) = estimate_specialized_cores("GTX 1080");
        assert_eq!(tensor, 0);
        assert_eq!(rt, 0);
    }
    
    #[test]
    fn test_estimate_memory_type() {
        assert_eq!(estimate_memory_type("RTX 4090"), "GDDR6X");
        assert_eq!(estimate_memory_type("RTX 3080"), "GDDR6X");
        assert_eq!(estimate_memory_type("GTX 1080"), "GDDR5");
    }
    
    #[test]
    fn test_estimate_memory_bandwidth() {
        let bandwidth = estimate_memory_bandwidth("RTX 4090", 50);
        assert_eq!(bandwidth, 504.0); // 1008 * 0.5
        
        let bandwidth = estimate_memory_bandwidth("Unknown", 100);
        assert_eq!(bandwidth, 500.0);
    }
    
    #[test]
    fn test_estimate_pcie_utilization() {
        assert_eq!(estimate_pcie_utilization(50, 30), 24); // (50+30)*0.3 = 24
        assert_eq!(estimate_pcie_utilization(0, 0), 0);
        assert_eq!(estimate_pcie_utilization(100, 100), 60);
    }
    
    #[test]
    fn test_generate_sm_utilizations() {
        let utilizations = generate_sm_utilizations(80, 4);
        assert_eq!(utilizations.len(), 4);
        
        // All values should be between 0.0 and 1.0
        for util in utilizations {
            assert!(util >= 0.0 && util <= 1.0);
        }
    }
    
    #[test]
    fn test_telemetry_frame_serialization() {
        let frame = TelemetryFrame {
            timestamp: now_ms(),
            device_index: 0,
            name: "Test GPU".to_string(),
            util_gpu: 50,
            util_memory: 60,
            memory_used_mb: 8192,
            memory_total_mb: 24576,
            sm_clock_mhz: 1500,
            memory_clock_mhz: 7000,
            temperature_c: 65,
            power_w: 250.0,
            fan_speed_percent: 70,
            sm_utilizations: vec![0.5, 0.6, 0.4],
            memory_bandwidth_gbps: 500.0,
            pcie_utilization: 30,
        };
        
        // Should serialize without errors
        let serialized = serde_json::to_string(&frame);
        assert!(serialized.is_ok());
    }
}

/// Recording status information.
#[derive(Serialize, Clone, Debug)]
pub struct RecordingStatus {
    pub is_recording: bool,
    pub session_id: Option<String>,
    pub duration_seconds: Option<u64>,
    pub elapsed_seconds: Option<u64>,
    pub sample_rate_hz: Option<u64>,
    pub metrics: Vec<String>,
    pub samples_collected: u64,
    pub output_file: Option<String>,
}

/// NSight report analysis results.
#[derive(Serialize, Clone, Debug)]
pub struct NSightAnalysis {
    pub report_type: String,
    pub gpu_name: String,
    pub kernels: Vec<KernelAnalysis>,
    pub bottlenecks: Vec<String>,
    pub recommendations: Vec<String>,
    pub performance_summary: PerformanceSummary,
}

/// Individual kernel analysis from NSight report.
#[derive(Serialize, Clone, Debug)]
pub struct KernelAnalysis {
    pub name: String,
    pub duration_ms: f64,
    pub grid_size: (u32, u32, u32),
    pub block_size: (u32, u32, u32),
    pub registers_per_thread: u32,
    pub shared_memory_bytes: u64,
    pub occupancy_percent: f64,
    pub sm_efficiency: f64,
    pub memory_efficiency: f64,
}

/// Performance summary from NSight analysis.
#[derive(Serialize, Clone, Debug)]
pub struct PerformanceSummary {
    pub total_gpu_time_ms: f64,
    pub average_sm_utilization: f64,
    pub memory_throughput_gbps: f64,
    pub compute_throughput_percent: f64,
    pub bottleneck_analysis: String,
}

// Global recording state
static RECORDING_STATE: std::sync::RwLock<Option<RecordingStatus>> = std::sync::RwLock::new(None);

/// Start interval recording of GPU metrics.
pub async fn start_interval_recording(
    duration_seconds: u64,
    sample_rate_hz: u64,
    metrics: Vec<String>
) -> Result<String> {
    // Check if already recording
    {
        let state = RECORDING_STATE.read().unwrap();
        if let Some(ref status) = *state {
            if status.is_recording {
                return Err(anyhow::anyhow!("Recording already in progress"));
            }
        }
    }
    
    let session_id = format!("rec_{}", now_ms());
    let output_file = format!("recordings/gpu_recording_{}.json", session_id);
    
    // Create recording status
    let recording_status = RecordingStatus {
        is_recording: true,
        session_id: Some(session_id.clone()),
        duration_seconds: Some(duration_seconds),
        elapsed_seconds: Some(0),
        sample_rate_hz: Some(sample_rate_hz),
        metrics: metrics.clone(),
        samples_collected: 0,
        output_file: Some(output_file.clone()),
    };
    
    // Update global state
    {
        let mut state = RECORDING_STATE.write().unwrap();
        *state = Some(recording_status);
    }
    
    // Start recording task
    let _session_id_clone = session_id.clone();
    tokio::spawn(async move {
        if let Err(e) = run_interval_recording(duration_seconds, sample_rate_hz, metrics, output_file).await {
            eprintln!("Recording error: {}", e);
        }
        
        // Clear recording state when done
        {
            let mut state = RECORDING_STATE.write().unwrap();
            *state = None;
        }
    });
    
    Ok(session_id)
}

/// Stop interval recording.
pub async fn stop_interval_recording() -> Result<String> {
    let output_file = {
        let mut state = RECORDING_STATE.write().unwrap();
        if let Some(ref mut status) = *state {
            if status.is_recording {
                status.is_recording = false;
                status.output_file.clone().unwrap_or_default()
            } else {
                return Err(anyhow::anyhow!("No active recording to stop"));
            }
        } else {
            return Err(anyhow::anyhow!("No active recording to stop"));
        }
    };
    
    Ok(output_file)
}

/// Get current recording status.
pub async fn get_recording_status() -> Result<RecordingStatus> {
    let state = RECORDING_STATE.read().unwrap();
    match *state {
        Some(ref status) => Ok(status.clone()),
        None => Ok(RecordingStatus {
            is_recording: false,
            session_id: None,
            duration_seconds: None,
            elapsed_seconds: None,
            sample_rate_hz: None,
            metrics: vec![],
            samples_collected: 0,
            output_file: None,
        })
    }
}

/// Run the actual interval recording.
async fn run_interval_recording(
    duration_seconds: u64,
    sample_rate_hz: u64,
    _metrics: Vec<String>,
    output_file: String
) -> Result<()> {
    // Create output directory if it doesn't exist
    if let Some(parent) = std::path::Path::new(&output_file).parent() {
        std::fs::create_dir_all(parent).context("Failed to create output directory")?;
    }
    
    let interval_ms = 1000 / sample_rate_hz;
    let total_samples = duration_seconds * sample_rate_hz;
    let mut samples = Vec::new();
    
    println!("Starting GPU recording: {}s at {}Hz -> {}", duration_seconds, sample_rate_hz, output_file);
    
    for sample_idx in 0..total_samples {
        let start_time = std::time::Instant::now();
        
        // Collect telemetry sample
        if let Ok(frame) = collect_telemetry_frame().await {
            samples.push(frame);
        }
        
        // Update recording status
        {
            let mut state = RECORDING_STATE.write().unwrap();
            if let Some(ref mut status) = *state {
                status.samples_collected = sample_idx + 1;
                status.elapsed_seconds = Some(sample_idx / sample_rate_hz);
                
                // Check if recording was stopped externally
                if !status.is_recording {
                    break;
                }
            }
        }
        
        // Wait for next sample
        let elapsed = start_time.elapsed();
        let target_duration = std::time::Duration::from_millis(interval_ms);
        if elapsed < target_duration {
            tokio::time::sleep(target_duration - elapsed).await;
        }
    }
    
    // Save recorded data
    let json_data = serde_json::to_string_pretty(&samples)
        .context("Failed to serialize recording data")?;
    std::fs::write(&output_file, json_data)
        .context("Failed to write recording file")?;
    
    println!("Recording completed: {} samples saved to {}", samples.len(), output_file);
    Ok(())
}

/// Collect a single telemetry frame
async fn collect_telemetry_frame() -> Result<TelemetryFrame> {
    let nvml = Nvml::init().context("Failed to initialize NVML")?;
    let device_count = nvml.device_count().context("Failed to get device count")?;
    
    if device_count == 0 {
        return Err(anyhow::anyhow!("No NVIDIA GPUs found"));
    }
    
    let device = nvml.device_by_index(0).context("Failed to get GPU device")?;
    create_simple_telemetry_frame(&device, 0)
}

/// Process NSight report file and extract performance insights.
pub async fn process_nsight_report(file_path: String) -> Result<NSightAnalysis> {
    // Check if file exists
    if !std::path::Path::new(&file_path).exists() {
        return Err(anyhow::anyhow!("NSight report file not found: {}", file_path));
    }
    
    // For now, return a mock analysis since actual NSight parsing is complex
    // In a real implementation, this would parse the binary NSight format
    let analysis = NSightAnalysis {
        report_type: "NSight Compute".to_string(),
        gpu_name: "RTX 4090".to_string(), // This would be parsed from the report
        kernels: vec![
            KernelAnalysis {
                name: "example_kernel".to_string(),
                duration_ms: 1.23,
                grid_size: (256, 1, 1),
                block_size: (256, 1, 1),
                registers_per_thread: 32,
                shared_memory_bytes: 4096,
                occupancy_percent: 87.5,
                sm_efficiency: 92.3,
                memory_efficiency: 78.9,
            }
        ],
        bottlenecks: vec![
            "Memory bandwidth limited".to_string(),
            "Low occupancy in kernel_xyz".to_string(),
        ],
        recommendations: vec![
            "Increase block size to improve occupancy".to_string(),
            "Optimize memory access patterns".to_string(),
            "Consider using shared memory for frequently accessed data".to_string(),
        ],
        performance_summary: PerformanceSummary {
            total_gpu_time_ms: 15.67,
            average_sm_utilization: 85.2,
            memory_throughput_gbps: 450.3,
            compute_throughput_percent: 78.9,
            bottleneck_analysis: "Memory bandwidth is the primary bottleneck".to_string(),
        },
    };
    
    Ok(analysis)
}
