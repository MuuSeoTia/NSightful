// NSight Report Parser - Handles parsing of Nsight Compute and Systems reports
export class NSightReportParser {
    constructor() {
        this.supportedFormats = ['ncu-report', 'nsys-report', 'json', 'csv'];
        this.parsingRules = new Map();
        this.initializeParsingRules();
    }

    initializeParsingRules() {
        // Define parsing rules for different report types
        this.parsingRules.set('ncu-report', {
            fileExtensions: ['.ncu-rep', '.ncu'],
            mimeTypes: ['application/octet-stream'],
            parser: this.parseNcuReport.bind(this)
        });

        this.parsingRules.set('nsys-report', {
            fileExtensions: ['.nsys-rep', '.qdrep'],
            mimeTypes: ['application/octet-stream'],
            parser: this.parseNsysReport.bind(this)
        });

        this.parsingRules.set('json', {
            fileExtensions: ['.json'],
            mimeTypes: ['application/json'],
            parser: this.parseJsonReport.bind(this)
        });

        this.parsingRules.set('csv', {
            fileExtensions: ['.csv'],
            mimeTypes: ['text/csv'],
            parser: this.parseCsvReport.bind(this)
        });
    }

    async parseReport(reportData, filename = '', format = null) {
        try {
            console.log('Parsing report:', filename);

            // Auto-detect format if not specified
            if (!format) {
                format = this.detectReportFormat(reportData, filename);
            }

            if (!this.parsingRules.has(format)) {
                throw new Error(`Unsupported report format: ${format}`);
            }

            const rule = this.parsingRules.get(format);
            const parsedData = await rule.parser(reportData);

            // Validate and normalize the parsed data
            const normalizedData = this.normalizeReportData(parsedData, format);

            return {
                format,
                filename,
                parsedAt: new Date().toISOString(),
                ...normalizedData
            };

        } catch (error) {
            console.error('Report parsing failed:', error);
            throw new Error(`Failed to parse report: ${error.message}`);
        }
    }

    detectReportFormat(data, filename) {
        // Try to detect format from filename extension
        const extension = this.getFileExtension(filename).toLowerCase();
        
        for (const [format, rule] of this.parsingRules) {
            if (rule.fileExtensions.includes(extension)) {
                return format;
            }
        }

        // Try to detect from data content
        if (typeof data === 'string') {
            try {
                JSON.parse(data);
                return 'json';
            } catch (e) {
                // Not JSON, check for CSV
                if (data.includes(',') && data.includes('\n')) {
                    return 'csv';
                }
            }
        }

        // Default to JSON for mock data
        return 'json';
    }

    getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot !== -1 ? filename.substring(lastDot) : '';
    }

    // Nsight Compute Report Parser
    async parseNcuReport(data) {
        // In a real implementation, this would parse binary .ncu-rep files
        // For now, we'll handle JSON exports from Nsight Compute
        
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (error) {
                throw new Error('Invalid NCU report format');
            }
        }

        return {
            type: 'ncu-report',
            metadata: this.extractNcuMetadata(data),
            kernels: this.extractNcuKernels(data),
            recommendations: this.extractNcuRecommendations(data)
        };
    }

    extractNcuMetadata(data) {
        return {
            gpuName: data.device?.name || 'Unknown GPU',
            driverVersion: data.environment?.driver?.version || 'Unknown',
            cudaVersion: data.environment?.cuda?.version || 'Unknown',
            applicationName: data.application?.name || 'Unknown',
            commandLine: data.application?.commandLine || '',
            timestamp: data.timestamp || new Date().toISOString(),
            computeCapability: data.device?.computeCapability || 'Unknown'
        };
    }

    extractNcuKernels(data) {
        if (!data.kernels || !Array.isArray(data.kernels)) {
            return [];
        }

        return data.kernels.map(kernel => ({
            name: kernel.name || 'Unknown Kernel',
            shortName: kernel.shortName || kernel.name,
            gridSize: kernel.launchConfiguration?.gridSize || [1, 1, 1],
            blockSize: kernel.launchConfiguration?.blockSize || [1, 1, 1],
            registers: kernel.registers || 0,
            sharedMemory: kernel.sharedMemory || 0,
            metrics: this.extractKernelMetrics(kernel.metrics),
            bottlenecks: this.extractKernelBottlenecks(kernel.analysis),
            executionTime: kernel.executionTime || 0,
            throughput: kernel.throughput || {}
        }));
    }

    extractKernelMetrics(metrics) {
        if (!metrics) return {};

        return {
            achievedOccupancy: metrics.achievedOccupancy || 0,
            smEfficiency: metrics.smEfficiency || 0,
            memoryEfficiency: metrics.memoryEfficiency || 0,
            computeThroughput: metrics.computeThroughput || 0,
            memoryThroughput: metrics.memoryThroughput || 0,
            l1CacheHitRate: metrics.l1CacheHitRate || 0,
            l2CacheHitRate: metrics.l2CacheHitRate || 0,
            dramThroughput: metrics.dramThroughput || 0,
            tensorUtilization: metrics.tensorUtilization || 0,
            warpExecutionEfficiency: metrics.warpExecutionEfficiency || 0
        };
    }

    extractKernelBottlenecks(analysis) {
        if (!analysis || !analysis.bottlenecks) return [];

        return analysis.bottlenecks.map(bottleneck => ({
            type: bottleneck.type || 'unknown',
            severity: bottleneck.severity || 'low',
            description: bottleneck.description || 'No description available',
            recommendation: bottleneck.recommendation || 'No recommendation available',
            impact: bottleneck.impact || 0
        }));
    }

    extractNcuRecommendations(data) {
        if (!data.recommendations) return [];

        return data.recommendations.map(rec => ({
            type: rec.type || 'general',
            priority: rec.priority || 'medium',
            description: rec.description || '',
            implementation: rec.implementation || '',
            expectedImprovement: rec.expectedImprovement || 0
        }));
    }

    // Nsight Systems Report Parser
    async parseNsysReport(data) {
        // In a real implementation, this would parse .nsys-rep files
        // For now, handle JSON exports or SQLite database exports
        
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (error) {
                throw new Error('Invalid NSYS report format');
            }
        }

        return {
            type: 'nsys-report',
            metadata: this.extractNsysMetadata(data),
            timeline: this.extractNsysTimeline(data),
            kernels: this.extractNsysKernels(data),
            memoryOps: this.extractNsysMemoryOps(data),
            apis: this.extractNsysApiCalls(data)
        };
    }

    extractNsysMetadata(data) {
        return {
            platform: data.platform || 'Unknown',
            gpuName: data.gpu?.name || 'Unknown GPU',
            driverVersion: data.driver?.version || 'Unknown',
            applicationName: data.application || 'Unknown',
            profilingDuration: data.duration || 0,
            timestamp: data.timestamp || new Date().toISOString()
        };
    }

    extractNsysTimeline(data) {
        if (!data.timeline) return [];

        return data.timeline.map(event => ({
            startTime: event.start || 0,
            endTime: event.end || 0,
            duration: event.duration || 0,
            type: event.type || 'unknown',
            name: event.name || 'Unknown Event',
            streamId: event.streamId || 0,
            deviceId: event.deviceId || 0
        }));
    }

    extractNsysKernels(data) {
        if (!data.kernels) return [];

        return data.kernels.map(kernel => ({
            name: kernel.name || 'Unknown Kernel',
            startTime: kernel.startTime || 0,
            endTime: kernel.endTime || 0,
            duration: kernel.duration || 0,
            gridSize: kernel.gridSize || [1, 1, 1],
            blockSize: kernel.blockSize || [1, 1, 1],
            streamId: kernel.streamId || 0,
            deviceId: kernel.deviceId || 0
        }));
    }

    extractNsysMemoryOps(data) {
        if (!data.memoryOps) return [];

        return data.memoryOps.map(op => ({
            type: op.type || 'unknown', // H2D, D2H, D2D, etc.
            startTime: op.startTime || 0,
            endTime: op.endTime || 0,
            duration: op.duration || 0,
            size: op.size || 0,
            bandwidth: op.bandwidth || 0,
            streamId: op.streamId || 0
        }));
    }

    extractNsysApiCalls(data) {
        if (!data.apiCalls) return [];

        return data.apiCalls.map(call => ({
            api: call.api || 'unknown', // CUDA, OpenGL, etc.
            function: call.function || 'unknown',
            startTime: call.startTime || 0,
            endTime: call.endTime || 0,
            duration: call.duration || 0,
            threadId: call.threadId || 0,
            processId: call.processId || 0
        }));
    }

    // JSON Report Parser (for custom formats)
    async parseJsonReport(data) {
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }

        // Handle various JSON report formats
        if (data.type === 'ncu-report') {
            return this.parseNcuReport(data);
        } else if (data.type === 'nsys-report') {
            return this.parseNsysReport(data);
        } else {
            // Generic JSON report
            return {
                type: 'json-report',
                metadata: data.metadata || {},
                data: data.data || data
            };
        }
    }

    // CSV Report Parser
    async parseCsvReport(data) {
        const lines = data.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('Invalid CSV format: insufficient data');
        }

        const headers = this.parseCsvLine(lines[0]);
        const rows = lines.slice(1).map(line => this.parseCsvLine(line));

        // Convert to objects
        const records = rows.map(row => {
            const record = {};
            headers.forEach((header, index) => {
                record[header] = this.parseValue(row[index]);
            });
            return record;
        });

        return {
            type: 'csv-report',
            metadata: {
                recordCount: records.length,
                fields: headers
            },
            records
        };
    }

    parseCsvLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    parseValue(value) {
        // Try to parse as number
        const num = parseFloat(value);
        if (!isNaN(num) && isFinite(num)) {
            return num;
        }

        // Try to parse as boolean
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;

        // Return as string
        return value;
    }

    // Report data normalization
    normalizeReportData(data, format) {
        const normalized = {
            metadata: data.metadata || {},
            kernels: data.kernels || [],
            recommendations: data.recommendations || [],
            timeline: data.timeline || [],
            memoryOps: data.memoryOps || [],
            apis: data.apis || []
        };

        // Ensure consistent kernel structure
        normalized.kernels = normalized.kernels.map(kernel => ({
            name: kernel.name || 'Unknown',
            shortName: kernel.shortName || kernel.name,
            gridSize: Array.isArray(kernel.gridSize) ? kernel.gridSize : [1, 1, 1],
            blockSize: Array.isArray(kernel.blockSize) ? kernel.blockSize : [1, 1, 1],
            metrics: kernel.metrics || {},
            bottlenecks: kernel.bottlenecks || [],
            executionTime: kernel.executionTime || kernel.duration || 0,
            ...kernel
        }));

        // Add derived metrics
        this.addDerivedMetrics(normalized);

        return normalized;
    }

    addDerivedMetrics(data) {
        data.kernels.forEach(kernel => {
            // Calculate theoretical occupancy
            kernel.theoreticalOccupancy = this.calculateTheoreticalOccupancy(kernel);
            
            // Calculate efficiency ratios
            kernel.efficiencyRatios = this.calculateEfficiencyRatios(kernel.metrics);
            
            // Determine bottleneck type
            kernel.primaryBottleneck = this.determinePrimaryBottleneck(kernel.metrics, kernel.bottlenecks);
        });

        // Calculate overall statistics
        data.overallStats = this.calculateOverallStats(data.kernels);
    }

    calculateTheoreticalOccupancy(kernel) {
        // Simplified occupancy calculation
        const blockSize = Array.isArray(kernel.blockSize) ? 
            kernel.blockSize.reduce((a, b) => a * b, 1) : 256;
        
        const maxThreadsPerSM = 2048; // Typical for modern GPUs
        const maxBlocksPerSM = 32;
        
        const threadsPerSM = Math.min(maxThreadsPerSM, blockSize * maxBlocksPerSM);
        return threadsPerSM / maxThreadsPerSM;
    }

    calculateEfficiencyRatios(metrics) {
        return {
            computeToMemory: (metrics.computeThroughput || 0) / Math.max(1, metrics.memoryThroughput || 1),
            l1ToL2: (metrics.l1CacheHitRate || 0) / Math.max(1, metrics.l2CacheHitRate || 1),
            achievedToTheoretical: (metrics.achievedOccupancy || 0) / Math.max(1, metrics.theoreticalOccupancy || 1)
        };
    }

    determinePrimaryBottleneck(metrics, bottlenecks) {
        if (bottlenecks && bottlenecks.length > 0) {
            // Find highest severity bottleneck
            const severityOrder = { high: 3, medium: 2, low: 1 };
            const primary = bottlenecks.reduce((max, current) => {
                const currentSeverity = severityOrder[current.severity] || 0;
                const maxSeverity = severityOrder[max.severity] || 0;
                return currentSeverity > maxSeverity ? current : max;
            });
            return primary.type;
        }

        // Determine from metrics
        if (metrics.memoryEfficiency < 50) return 'memory';
        if (metrics.smEfficiency < 70) return 'compute';
        if (metrics.achievedOccupancy < 0.5) return 'occupancy';
        
        return 'none';
    }

    calculateOverallStats(kernels) {
        if (kernels.length === 0) return {};

        const stats = {
            totalKernels: kernels.length,
            totalExecutionTime: 0,
            averageOccupancy: 0,
            averageSMEfficiency: 0,
            averageMemoryEfficiency: 0,
            bottleneckDistribution: {}
        };

        kernels.forEach(kernel => {
            stats.totalExecutionTime += kernel.executionTime || 0;
            stats.averageOccupancy += kernel.metrics.achievedOccupancy || 0;
            stats.averageSMEfficiency += kernel.metrics.smEfficiency || 0;
            stats.averageMemoryEfficiency += kernel.metrics.memoryEfficiency || 0;

            const bottleneck = kernel.primaryBottleneck || 'none';
            stats.bottleneckDistribution[bottleneck] = (stats.bottleneckDistribution[bottleneck] || 0) + 1;
        });

        stats.averageOccupancy /= kernels.length;
        stats.averageSMEfficiency /= kernels.length;
        stats.averageMemoryEfficiency /= kernels.length;

        return stats;
    }

    // Export functionality for processed reports
    exportReport(parsedReport, format = 'json') {
        switch (format) {
            case 'json':
                return JSON.stringify(parsedReport, null, 2);
            case 'csv':
                return this.exportToCsv(parsedReport);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    exportToCsv(parsedReport) {
        if (!parsedReport.kernels || parsedReport.kernels.length === 0) {
            return 'No kernel data available';
        }

        const headers = [
            'Kernel Name',
            'Grid Size',
            'Block Size',
            'Execution Time',
            'SM Efficiency',
            'Memory Efficiency',
            'Achieved Occupancy',
            'Primary Bottleneck'
        ];

        const rows = parsedReport.kernels.map(kernel => [
            kernel.name,
            Array.isArray(kernel.gridSize) ? kernel.gridSize.join('x') : 'Unknown',
            Array.isArray(kernel.blockSize) ? kernel.blockSize.join('x') : 'Unknown',
            kernel.executionTime || 0,
            kernel.metrics.smEfficiency || 0,
            kernel.metrics.memoryEfficiency || 0,
            kernel.metrics.achievedOccupancy || 0,
            kernel.primaryBottleneck || 'none'
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }
}



