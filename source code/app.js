/* ==========================================================================
   MindFlow Application Main Controller (app.js)
   Coordinates UI tabs, webcam media feeds, logging, and statistics aggregates
   ========================================================================== */

const App = {
    webcamStream: null,
    isWebcamRunning: false,
    
    // Sessions Telemetries
    sessionStartTime: 0,
    sessionInterval: null,
    
    // Performance scoring
    successScore: 0,
    totalFocusSum: 0,
    totalStressSum: 0,
    tickCount: 0,
    
    /**
     * Bootstraps the application on document load
     */
    init() {
        console.log("MindFlow: Bootstrapping application components...");
        
        // 1. Initialize custom charts
        if (window.Charts) {
            window.Charts.init();
        }
        
        // 2. Initialize text reflection workspace
        const reflectionTextarea = document.getElementById('reflection-textarea');
        if (window.Sentiment && reflectionTextarea) {
            window.Sentiment.init(reflectionTextarea);
        }

        // 3. Initialize Learning modules
        if (window.Learning) {
            window.Learning.init();
        }

        // 4. Load detector models asynchronously
        if (window.Detector) {
            window.Detector.init().then(success => {
                if (success) {
                    console.log("MindFlow: System ready. Waiting for webcam activation.");
                } else {
                    alert("Unable to load emotion recognition models. Please check your network connection.");
                }
            });
        }
        
        this.sessionStartTime = Date.now();
        this.startSessionTimer();
    },

    /**
     * Start the session running duration clock
     */
    startSessionTimer() {
        const timeBadge = document.getElementById('dash-session-time');
        
        this.sessionInterval = setInterval(() => {
            const elapsed = Date.now() - this.sessionStartTime;
            const minutes = Math.floor(elapsed / 60000).toString().padStart(2, '0');
            const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
            
            if (timeBadge) {
                timeBadge.textContent = `${minutes}:${seconds}`;
            }
        }, 1000);
    },

    /**
     * Handler invoked on every detection tick from detector.js
     */
    onTelemetryTick(data) {
        // Accumulate running scorecard statistics
        this.tickCount++;
        this.totalFocusSum += data.focus;
        this.totalStressSum += data.stress;
        
        // 1. Update live sidebar visual meters
        const barFocus = document.getElementById('bar-focus');
        const valFocus = document.getElementById('val-focus');
        const barStress = document.getElementById('bar-stress');
        const valStress = document.getElementById('val-stress');
        const barBored = document.getElementById('bar-bored');
        const valBored = document.getElementById('val-bored');
        
        if (barFocus) barFocus.style.width = `${data.focus}%`;
        if (valFocus) valFocus.textContent = `${data.focus}%`;
        
        if (barStress) barStress.style.width = `${data.stress}%`;
        if (valStress) valStress.textContent = `${data.stress}%`;
        
        if (barBored) barBored.style.width = `${data.boredom}%`;
        if (valBored) valBored.textContent = `${data.boredom}%`;

        // 2. Feed data into learning support decision engine
        if (window.Learning) {
            window.Learning.processTelemetry(data);
        }

        // 3. Feed data into dashboard charts
        if (window.Charts) {
            window.Charts.pushTrend(data.focus, data.stress);
            window.Charts.accumulateEmotions(data.emotions);
            window.Charts.accumulateDurations(data.focus, data.stress, data.boredom);
        }

        // 4. Update Dashboard scorecards
        this.updateDashboardUi();
    },

    updateDashboardUi() {
        const avgFocusBadge = document.getElementById('dash-focus-index');
        const avgStressBadge = document.getElementById('dash-stress-index');
        const successBadge = document.getElementById('dash-success-score');
        
        if (avgFocusBadge && this.tickCount > 0) {
            avgFocusBadge.textContent = `${Math.round(this.totalFocusSum / this.tickCount)}%`;
        }
        if (avgStressBadge && this.tickCount > 0) {
            avgStressBadge.textContent = `${Math.round(this.totalStressSum / this.tickCount)}%`;
        }
        if (successBadge) {
            successBadge.textContent = this.successScore;
        }
    },

    /**
     * WebRTC Webcam operations (start/stop)
     */
    async toggleWebcam() {
        const video = document.getElementById('webcam');
        const canvas = document.getElementById('overlay');
        const placeholder = document.getElementById('webcam-placeholder');
        const btn = document.getElementById('btn-webcam');
        const statusDot = document.querySelector('#camera-status .pulse-dot');
        const statusLabel = document.querySelector('#camera-status .status-label');

        if (this.isWebcamRunning) {
            // STOP camera stream
            this.isWebcamRunning = false;
            
            if (window.Detector) {
                window.Detector.stopTracking(canvas);
            }
            
            if (this.webcamStream) {
                this.webcamStream.getTracks().forEach(track => track.stop());
                this.webcamStream = null;
            }
            
            if (video) {
                video.srcObject = null;
                video.style.display = 'none';
            }
            if (placeholder) placeholder.style.display = 'flex';
            if (btn) btn.innerHTML = `<i class="fa-solid fa-camera-rotate"></i> Start Webcam`;
            
            if (statusDot && statusLabel) {
                statusDot.className = "pulse-dot red";
                statusLabel.textContent = "Camera Offline";
            }
            
            this.logEvent("Camera", "Webcam deactivated by user.", "Off");
        } else {
            // START camera stream
            try {
                const constraints = {
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: "user"
                    },
                    audio: false
                };
                
                this.webcamStream = await navigator.mediaDevices.getUserMedia(constraints);
                
                if (video) {
                    video.srcObject = this.webcamStream;
                    video.style.display = 'block';
                    placeholder.style.display = 'none';
                }
                
                this.isWebcamRunning = true;
                if (btn) btn.innerHTML = `<i class="fa-solid fa-video-slash"></i> Stop Webcam`;
                
                if (statusDot && statusLabel) {
                    statusDot.className = "pulse-dot green";
                    statusLabel.textContent = "Camera Active";
                }
                
                this.logEvent("Camera", "Webcam access granted. Face streams active.", "Active");
                
                // Initialize emotion tracking loop
                if (window.Detector) {
                    window.Detector.startTracking(video, canvas, (data) => this.onTelemetryTick(data));
                }
                
            } catch (error) {
                console.error("Camera access error:", error);
                alert("Could not access camera. Ensure browser permissions are granted and camera isn't used by another application.");
                this.logEvent("Camera", "Webcam connection rejected.", "Blocked");
            }
        }
    },

    /**
     * Navigation pane tab switching
     */
    switchTab(tabName) {
        const panes = document.querySelectorAll('.tab-pane');
        const navBtns = document.querySelectorAll('.nav-btn');
        
        panes.forEach(pane => pane.classList.remove('active'));
        navBtns.forEach(btn => btn.classList.remove('active'));
        
        if (tabName === 'study') {
            document.getElementById('tab-study').classList.add('active');
            document.getElementById('btn-study').classList.add('active');
        } else if (tabName === 'dashboard') {
            document.getElementById('tab-dashboard').classList.add('active');
            document.getElementById('btn-dashboard').classList.add('active');
            
            // Resize charts on display triggers to prevent layout squashing
            setTimeout(() => {
                if (window.Charts) {
                    if (window.Charts.trendChart) window.Charts.trendChart.resize();
                    if (window.Charts.pieChart) window.Charts.pieChart.resize();
                    if (window.Charts.barChart) window.Charts.barChart.resize();
                }
            }, 100);
        }
    },

    /**
     * Logging component: appends custom structured log row to the empathy table
     */
    logEvent(source, action, outcome) {
        const tbody = document.getElementById('empathy-log-body');
        if (!tbody) return;
        
        // Remove empty placeholder row if exists
        const emptyRow = tbody.querySelector('.empty-row');
        if (emptyRow) emptyRow.remove();
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        // Determine dynamic badges
        let sourceBadge = `<span class="badge-action">${source}</span>`;
        let outcomeBadge = `<span class="badge-outcome">${outcome}</span>`;
        
        if (outcome === 'Stressed' || outcome === 'Bored' || outcome === 'Blocked') {
            outcomeBadge = `<span class="badge-emotion">${outcome}</span>`;
        } else if (outcome === 'Off' || outcome === 'Normal') {
            outcomeBadge = `<span class="badge-emotion neutral">${outcome}</span>`;
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${timestamp}</td>
            <td>${sourceBadge}</td>
            <td>${action}</td>
            <td>${outcomeBadge}</td>
        `;
        
        // Insert new log at the top
        tbody.insertBefore(tr, tbody.firstChild);
    },

    clearEventLog() {
        const tbody = document.getElementById('empathy-log-body');
        if (!tbody) return;
        tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No logs collected in this session. Start studying!</td></tr>`;
    }
};

// Start application on page load
window.App = App;
window.addEventListener('DOMContentLoaded', () => {
    App.init();
});
