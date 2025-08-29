# Deployment Guide

This guide covers building, packaging, and deploying NSightful GPU Visualizer for production use.

## 🏗️ Build Process

### Prerequisites
- Node.js 18+ with npm
- Rust stable toolchain
- Platform-specific dependencies (see below)

### Platform Dependencies

#### Windows
```powershell
# No additional dependencies required
# Ensure Visual Studio Build Tools are installed
```

#### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y \
    libgtk-3-dev \
    libwebkit2gtk-4.0-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf
```

## 🔨 Building for Production

### 1. Prepare Environment
```bash
# Clone and navigate to project
git clone https://github.com/MuuSeoTia/NSightful.git
cd NSightful/gpuviz-data

# Install dependencies
npm ci
```

### 2. Build Application
```bash
# Build optimized frontend
npm run build

# Build Tauri application with bundled installer
npm run tauri build
```

### 3. Build Artifacts
After building, find artifacts in:
```
src-tauri/target/release/bundle/
├── deb/          # Linux .deb packages
├── appimage/     # Linux AppImage
├── dmg/          # macOS .dmg files
├── app/          # macOS .app bundles
├── msi/          # Windows .msi installers
└── nsis/         # Windows NSIS installers
```

## 📦 Packaging Options

### Windows
- **MSI Installer**: `target/release/bundle/msi/`
- **NSIS Installer**: `target/release/bundle/nsis/`
- **Portable**: `target/release/nsightful-gpu-visualizer.exe`

### macOS
- **DMG Installer**: `target/release/bundle/dmg/`
- **App Bundle**: `target/release/bundle/app/`

### Linux
- **DEB Package**: `target/release/bundle/deb/`
- **AppImage**: `target/release/bundle/appimage/`
- **Binary**: `target/release/nsightful-gpu-visualizer`

## 🚀 Automated Deployment

### GitHub Actions
The project includes automated CI/CD pipelines:

```yaml
# Triggered on tag push (v*.*.*)
git tag v0.1.0
git push origin v0.1.0
```

### Manual Release
```bash
# Create release builds for all platforms
npm run build:all

# Sign binaries (macOS/Windows)
npm run sign

# Create installers
npm run package
```

## 🔧 Configuration

### Tauri Bundle Configuration
Edit `tauri.conf.json` for packaging options:

```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "identifier": "com.nsightful.gpuviz",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [],
    "externalBin": [],
    "copyright": "",
    "category": "DeveloperTool",
    "shortDescription": "GPU Visualization Tool",
    "longDescription": "Professional GPU monitoring and visualization desktop application",
    "deb": {
      "depends": ["libwebkit2gtk-4.0-37", "libgtk-3-0"],
      "section": "science"
    },
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "10.13",
      "exceptionDomain": "",
      "signingIdentity": null,
      "providerShortName": null,
      "entitlements": null
    },
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    }
  }
}
```

## 🛡️ Code Signing

### Windows
```bash
# Using signtool
signtool sign /f cert.pfx /p password /t http://timestamp.url target/release/bundle/msi/*.msi
```

### macOS
```bash
# Developer ID Application certificate required
codesign --force --verify --verbose --sign "Developer ID Application: Your Name" target/release/bundle/app/*.app
```

### Linux
```bash
# GPG signing for repositories
gpg --armor --detach-sign target/release/bundle/deb/*.deb
```

## 📋 Distribution

### Direct Download
1. Upload build artifacts to GitHub Releases
2. Provide checksums for verification
3. Include installation instructions

### Package Managers

#### Windows (Chocolatey)
```xml
<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2015/06/nuspec.xsd">
  <metadata>
    <id>nsightful-gpu-visualizer</id>
    <version>0.1.0</version>
    <title>NSightful GPU Visualizer</title>
    <authors>NSightful Team</authors>
    <description>Professional GPU monitoring and visualization</description>
  </metadata>
</package>
```

#### macOS (Homebrew)
```ruby
class NsightfulGpuVisualizer < Formula
  desc "Professional GPU monitoring and visualization"
  homepage "https://github.com/MuuSeoTia/NSightful"
  url "https://github.com/MuuSeoTia/NSightful/releases/download/v0.1.0/nsightful-gpu-visualizer_0.1.0_x64.dmg"
  sha256 "..."
  
  def install
    prefix.install "NSightful GPU Visualizer.app"
  end
end
```

#### Linux (AppImage)
```bash
# Make AppImage executable
chmod +x NSightful_GPU_Visualizer-0.1.0-x86_64.AppImage

# Optional: Integrate with desktop
./NSightful_GPU_Visualizer-0.1.0-x86_64.AppImage --appimage-extract-and-run
```

## 🔍 Testing Deployment

### Smoke Tests
```bash
# Test installation
npm run test:install

# Test basic functionality
npm run test:smoke

# Performance benchmarks
npm run test:performance
```

### Manual Testing Checklist
- [ ] Application launches without errors
- [ ] GPU detection works correctly
- [ ] 3D visualization renders properly
- [ ] Real-time telemetry updates
- [ ] Settings persistence
- [ ] Graceful error handling
- [ ] Proper uninstallation

## 🐛 Troubleshooting

### Common Issues

#### Windows
- **MSVC Runtime**: Ensure Visual C++ Redistributable is installed
- **Windows Defender**: May flag unsigned executables
- **Permissions**: Run as administrator for NVML access

#### macOS
- **Gatekeeper**: Right-click → Open for unsigned apps
- **Notarization**: Required for distribution outside App Store
- **System Preferences**: Allow apps from identified developers

#### Linux
- **Dependencies**: Install required system libraries
- **Permissions**: Add user to appropriate groups for GPU access
- **Display**: Ensure GPU drivers support required OpenGL version

### Performance Optimization
```bash
# Optimize bundle size
npm run build -- --optimize

# Enable compression
npm run build -- --compress

# Tree shake unused code
npm run build -- --tree-shake
```

## 📊 Monitoring

### Crash Reporting
- Configure Sentry or similar service
- Include debug symbols in release builds
- Set up automated crash collection

### Analytics
- Track usage patterns
- Monitor performance metrics
- Collect user feedback

### Updates
- Implement auto-update mechanism
- Provide update notifications
- Maintain backward compatibility

## 🔐 Security Considerations

### Binary Integrity
- Sign all executables
- Provide checksums
- Use secure distribution channels

### Permissions
- Minimize required permissions
- Document security requirements
- Regular security audits

### Dependencies
- Regular dependency updates
- Security vulnerability scanning
- License compliance checking

---

For additional deployment support, see:
- [Tauri Deployment Guide](https://tauri.app/v1/guides/distribution/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Project Issues](https://github.com/MuuSeoTia/NSightful/issues)
