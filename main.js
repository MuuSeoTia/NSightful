// NSightful GPU Visualizer - Main Application
import { AppController } from './js/controllers/AppController.js';

// MVC Architecture Implementation
class NSightfulApp {
    constructor() {
        this.controller = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('Initializing NSightful GPU Visualizer...');
            
            // Initialize the main controller (which will handle Model and View initialization)
            this.controller = new AppController();
            await this.controller.initialize();
            
            this.isInitialized = true;
            console.log('NSightful GPU Visualizer initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize NSightful GPU Visualizer:', error);
            this.showErrorMessage('Failed to initialize application. Please refresh and try again.');
        }
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 107, 107, 0.9);
            color: white;
            padding: 2rem;
            border-radius: 8px;
            text-align: center;
            z-index: 10000;
            font-size: 1.1rem;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NSightfulApp().init();
});

// Export for potential external use
export { NSightfulApp };