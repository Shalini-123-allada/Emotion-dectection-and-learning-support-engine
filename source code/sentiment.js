/* ==========================================================================
   MindFlow Text Sentiment & Keystroke Telemetry (sentiment.js)
   Integrates typing dynamics (hesitations, error rates) and text sentiment
   ========================================================================== */

const Sentiment = {
    // Configuration & weights
    negKeywords: ['stuck', 'confused', 'hard', 'frustrated', 'difficult', 'fail', 'error', 'wrong', 'bored', 'hate', 'stress', 'tired', 'slow', 'lost', 'help', 'impossible'],
    posKeywords: ['easy', 'understand', 'clear', 'solved', 'fun', 'happy', 'great', 'awesome', 'good', 'learn', 'succeeded', 'perfect', 'like', 'love', 'done', 'simple'],
    
    // Keystroke state
    lastKeyTime: 0,
    startTime: 0,
    backspaceCount: 0,
    charCount: 0,
    wpm: 0,
    typingStress: 'low', // low, medium, high
    textSentiment: 'neutral', // positive, neutral, negative
    
    typingTimeout: null,
    wpmInterval: null,
    isUserTyping: false,
    
    /**
     * Binds listeners to the textarea element
     */
    init(textareaEl) {
        if (!textareaEl) return;
        
        textareaEl.addEventListener('keydown', (e) => {
            const now = Date.now();
            
            // Set start time on first keystroke
            if (this.startTime === 0) {
                this.startTime = now;
            }
            
            this.lastKeyTime = now;
            this.isUserTyping = true;
            this.charCount++;
            
            if (e.key === 'Backspace') {
                this.backspaceCount++;
            }
            
            // Reset inactivity typing state after 3 seconds of no key presses
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                this.isUserTyping = false;
            }, 3000);
            
            // Compute telemetry metrics immediately
            this.analyzeStress();
        });

        textareaEl.addEventListener('input', (e) => {
            this.analyzeText(e.target.value);
        });

        // Compute words per minute (WPM) on a 2-second interval
        this.wpmInterval = setInterval(() => {
            this.calculateWpm();
            this.updateUi();
        }, 2000);
    },

    /**
     * Clear and reset typing registers
     */
    reset() {
        this.startTime = 0;
        this.lastKeyTime = 0;
        this.backspaceCount = 0;
        this.charCount = 0;
        this.wpm = 0;
        this.typingStress = 'low';
        this.textSentiment = 'neutral';
        this.isUserTyping = false;
    },

    /**
     * Helper returns if typing has occurred recently
     */
    isTyping() {
        return this.isUserTyping;
    },

    /**
     * Calculates user Words-Per-Minute
     */
    calculateWpm() {
        if (this.startTime === 0 || this.charCount === 0) {
            this.wpm = 0;
            return;
        }
        
        const durationMinutes = (Date.now() - this.startTime) / 60000;
        
        // Average word length is 5 chars. WPM = (chars / 5) / time
        const calculated = Math.round((this.charCount / 5) / durationMinutes);
        
        // Cap WPM calculation outliers
        this.wpm = Math.min(150, Math.max(0, calculated));
    },

    /**
     * Analyzes keystroke stress levels (backspaces vs characters ratio)
     */
    analyzeStress() {
        if (this.charCount < 10) {
            this.typingStress = 'low';
            return;
        }

        // Deletion ratio (what percentage of keystrokes are backspaces)
        const errorRatio = this.backspaceCount / this.charCount;
        
        // High deletion ratio or long intervals indicate frustration
        if (errorRatio > 0.18) {
            this.typingStress = 'high';
        } else if (errorRatio > 0.10) {
            this.typingStress = 'medium';
        } else {
            this.typingStress = 'low';
        }
    },

    /**
     * Analyzes actual word content for positive vs negative emotion clues
     */
    analyzeText(text) {
        if (!text) {
            this.textSentiment = 'neutral';
            return;
        }
        
        const cleanText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        const words = cleanText.split(/\s+/);
        
        let posCount = 0;
        let negCount = 0;

        words.forEach(word => {
            if (this.posKeywords.includes(word)) {
                posCount++;
            } else if (this.negKeywords.includes(word)) {
                negCount++;
            }
        });

        if (posCount > negCount) {
            this.textSentiment = 'positive';
        } else if (negCount > posCount) {
            this.textSentiment = 'negative';
        } else {
            this.textSentiment = 'neutral';
        }
    },

    /**
     * Local UI updates for workspace reflection widget badges
     */
    updateUi() {
        const wpmBadge = document.getElementById('telemetry-wpm');
        const sentimentLabel = document.getElementById('sentiment-label');
        const stressLabel = document.getElementById('typing-stress-label');

        if (wpmBadge) wpmBadge.textContent = `${this.wpm} WPM`;
        
        if (sentimentLabel) {
            sentimentLabel.textContent = this.textSentiment.charAt(0).toUpperCase() + this.textSentiment.slice(1);
            sentimentLabel.className = this.textSentiment; // positive, neutral, negative
        }

        if (stressLabel) {
            stressLabel.textContent = this.typingStress.charAt(0).toUpperCase() + this.typingStress.slice(1);
            stressLabel.className = this.typingStress; // low, medium, high
        }
    }
};

// Export to window
window.Sentiment = Sentiment;
