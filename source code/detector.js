/* ==========================================================================
   MindFlow Face Tracker & Emotion Detector (detector.js)
   Powered by face-api.js (vladmandic) running client-side
   ========================================================================== */

const Detector = {
    // Model URL pointing to jsDelivr CDN hosting vladmandic's face-api models
    modelUrl: 'https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/',
    modelsLoaded: false,
    trackingInterval: null,
    isTracking: false,
    
    // Telemetry registers
    activeEmotions: {
        neutral: 0.5,
        happy: 0.0,
        sad: 0.0,
        angry: 0.0,
        fearful: 0.0,
        disgusted: 0.0,
        surprised: 0.0
    },
    
    // Focus & Stress outputs
    focusScore: 50,
    stressScore: 0,
    boredomScore: 0,
    noFaceCount: 0,

    /**
     * Initializes and loads the face-api neural nets
     */
    async init() {
        const modelStatusLabel = document.querySelector('#model-status .status-label');
        const modelStatusDot = document.querySelector('#model-status .pulse-dot');
        
        try {
            console.log("MindFlow: Loading neural network models from CDN...");
            
            // Load TinyFaceDetector (for fast facial bounding boxes) and FaceExpressionNet (for expressions)
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(this.modelUrl),
                faceapi.nets.faceExpressionNet.loadFromUri(this.modelUrl)
            ]);
            
            this.modelsLoaded = true;
            console.log("MindFlow: Neural network models loaded successfully.");
            
            if (modelStatusLabel && modelStatusDot) {
                modelStatusLabel.textContent = "AI Models Active";
                modelStatusDot.className = "pulse-dot green";
            }
            
            // Log loading event to the app
            if (window.App && window.App.logEvent) {
                window.App.logEvent("System", "AI Models initialized successfully from CDN", "Ready");
            }
            
            return true;
        } catch (error) {
            console.error("MindFlow: Error loading neural networks: ", error);
            if (modelStatusLabel && modelStatusDot) {
                modelStatusLabel.textContent = "AI Models Failed to Load";
                modelStatusDot.className = "pulse-dot red";
            }
            return false;
        }
    },

    /**
     * Starts the tracking loop processing the video frame
     */
    startTracking(videoEl, canvasEl, onMetricsUpdate) {
        if (!this.modelsLoaded || this.isTracking) return;
        
        this.isTracking = true;
        const ctx = canvasEl.getContext('2d');
        
        // Match canvas dimensions to webcam video size
        const resizeCanvas = () => {
            const displaySize = { width: videoEl.videoWidth, height: videoEl.videoHeight };
            if (displaySize.width > 0) {
                faceapi.matchDimensions(canvasEl, displaySize);
            }
            return displaySize;
        };
        
        let displaySize = resizeCanvas();
        videoEl.addEventListener('play', () => {
            displaySize = resizeCanvas();
        });

        // Run detection every 200ms to preserve user CPU cycles
        this.trackingInterval = setInterval(async () => {
            if (videoEl.paused || videoEl.ended || !this.isTracking) return;
            
            // Check if dimensions changed
            if (canvasEl.width !== videoEl.videoWidth) {
                displaySize = resizeCanvas();
            }

            try {
                // Detect single face and expressions
                const detection = await faceapi.detectSingleFace(
                    videoEl, 
                    new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.2 })
                ).withFaceExpressions();
                
                // Clear overlay
                ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
                
                if (detection) {
                    this.noFaceCount = 0;
                    
                    // Update active emotions registry
                    this.activeEmotions = { ...detection.expressions };
                    
                    // Re-calculate cognitive metrics
                    this.calculateMetrics();
                    
                    // Draw custom cyberpunk HUD graphic on canvas
                    this.drawHUD(ctx, detection.detection.box, this.getDominantEmotion());
                    
                } else {
                    this.noFaceCount++;
                    
                    // If no face is visible, decrement focus score slowly
                    if (this.noFaceCount > 15) { // ~3 seconds of looking away
                        this.focusScore = Math.max(0, this.focusScore - 2);
                        this.boredomScore = Math.min(100, this.boredomScore + 1);
                        this.activeEmotions.neutral = 0.8; // Assume neutral/disengaged
                    }
                    
                    // Draw HUD for "No Face Detected" warning
                    this.drawHUD(ctx, null, "Searching...");
                }
                
                // Fire update callback for UI dashboard and learning engine
                if (onMetricsUpdate) {
                    onMetricsUpdate({
                        emotions: this.activeEmotions,
                        focus: this.focusScore,
                        stress: this.stressScore,
                        boredom: this.boredomScore,
                        facePresent: !!detection
                    });
                }
                
            } catch (err) {
                console.error("Tracking process error:", err);
            }
        }, 200);
    },

    /**
     * Stops the emotion tracking loops
     */
    stopTracking(canvasEl) {
        this.isTracking = false;
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
        if (canvasEl) {
            const ctx = canvasEl.getContext('2d');
            ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        }
    },

    /**
     * Internal helper to calculate focus, stress, and boredom indexes from emotions
     */
    calculateMetrics() {
        const { happy, sad, angry, fearful, neutral, surprised, disgusted } = this.activeEmotions;
        
        // Stress index increases with frustration markers (angry, sad, fearful, disgusted)
        const stressWeight = (angry * 1.0) + (fearful * 0.7) + (sad * 0.5) + (disgusted * 0.4);
        this.stressScore = Math.round(stressWeight * 100);
        
        // Boredom index increases if neutral state is high, and active typing reflection is low
        const isTyping = window.Sentiment ? window.Sentiment.isTyping() : false;
        const typingBoredomFactor = isTyping ? 0.3 : 1.0;
        this.boredomScore = Math.round(neutral * 80 * typingBoredomFactor + sad * 20);
        
        // Focus Index: standard state optimization metric
        // High focus = neutral-focused engagement, happy state, or moderate surprised attention.
        // Penalty for frustration, sadness, high fear, or absolute disengaged looking away.
        let baseFocus = (neutral * 70) + (happy * 100) + (surprised * 60);
        
        // Factor in typing speed (active interaction increases focus proxy score)
        if (window.Sentiment && window.Sentiment.wpm > 20) {
            baseFocus += Math.min(15, window.Sentiment.wpm / 4);
        }
        
        // Apply stress and disengagement penalties
        const penalty = (this.stressScore * 0.3) + (this.boredomScore * 0.2);
        
        this.focusScore = Math.round(Math.max(0, Math.min(100, baseFocus - penalty)));
    },

    /**
     * Returns the emotion with the highest confidence value
     */
    getDominantEmotion() {
        let maxVal = -1;
        let dominant = "neutral";
        
        for (const [emotion, val] of Object.entries(this.activeEmotions)) {
            if (val > maxVal) {
                maxVal = val;
                dominant = emotion;
            }
        }
        return dominant;
    },

    /**
     * Draws a futuristic HUD bounding box on the face
     */
    drawHUD(ctx, box, statusText) {
        if (!box) {
            // Draw scanning line overlay
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(10, 20);
            ctx.lineTo(ctx.canvas.width - 10, 20);
            ctx.stroke();
            return;
        }

        const { x, y, width, height } = box;
        
        // Set dynamic glowing colors based on focus/stress
        let hudColor = 'rgba(99, 102, 241, 0.85)'; // default Indigo
        if (this.stressScore > 50) {
            hudColor = 'rgba(239, 68, 68, 0.85)';  // Rose red for stress
        } else if (this.focusScore > 75) {
            hudColor = 'rgba(16, 185, 129, 0.85)'; // Emerald green for high focus
        } else if (this.boredomScore > 65) {
            hudColor = 'rgba(245, 158, 11, 0.85)';  // Amber for disengaged
        }

        ctx.strokeStyle = hudColor;
        ctx.lineWidth = 2;
        
        // Draw corner brackets instead of solid boxes for a technical UI look
        const len = Math.min(width, height) * 0.15; // bracket length
        
        // Top Left Corner
        ctx.beginPath();
        ctx.moveTo(x + len, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + len);
        ctx.stroke();
        
        // Top Right Corner
        ctx.beginPath();
        ctx.moveTo(x + width - len, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + width, y + len);
        ctx.stroke();
        
        // Bottom Left Corner
        ctx.beginPath();
        ctx.moveTo(x, y + height - len);
        ctx.lineTo(x, y + height);
        ctx.lineTo(x + len, y + height);
        ctx.stroke();
        
        // Bottom Right Corner
        ctx.beginPath();
        ctx.moveTo(x + width, y + height - len);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x + width - len, y + height);
        ctx.stroke();

        // Draw soft bounding fill glow
        ctx.fillStyle = hudColor.replace('0.85', '0.03');
        ctx.fillRect(x, y, width, height);

        // Draw mini HUD Label tag
        ctx.font = 'bold 11px Inter, system-ui';
        ctx.fillStyle = hudColor;
        
        const capitalizedEmotion = statusText.charAt(0).toUpperCase() + statusText.slice(1);
        const labelText = `SYS TRACK: ${capitalizedEmotion}`;
        
        const textWidth = ctx.measureText(labelText).width;
        
        // Draw label background badge
        ctx.fillStyle = 'rgba(11, 9, 21, 0.85)';
        ctx.fillRect(x, y - 22, textWidth + 16, 18);
        ctx.strokeStyle = hudColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y - 22, textWidth + 16, 18);
        
        // Draw label text
        ctx.fillStyle = hudColor;
        ctx.fillText(labelText, x + 8, y - 9);
    }
};

// Export to window
window.Detector = Detector;
