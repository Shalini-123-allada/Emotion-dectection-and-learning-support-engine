/* ==========================================================================
   MindFlow Learning Content & Adaptive Support Engine (learning.js)
   Houses study workspaces, gamified elements, and intervention logic
   ========================================================================== */

const Learning = {
    currentModule: null,
    currentDifficulty: 'normal', // normal, easy, challenging
    currentQuestionIndex: 0,
    selectedOption: null,
    
    // Support state
    interventionCount: 0,
    streakCount: 0,
    multiplier: 1.0,
    activeIntervention: null, // 'breathing', 'booster', null
    
    // Adaptive tracking triggers
    stressIncidentCounter: 0,
    boredomIncidentCounter: 0,
    
    // Task Databases
    modules: {
        logic: [
            {
                difficulty: 'easy',
                prompt: "Solve for X: 3x - 5 = 10",
                options: ["x = 3", "x = 5", "x = 4", "x = 6"],
                correctIndex: 1,
                hint: "Add 5 to both sides of the equation, then divide by 3."
            },
            {
                difficulty: 'normal',
                prompt: "Find the next number in the sequence: 2, 6, 12, 20, 30, ...",
                options: ["36", "42", "40", "44"],
                correctIndex: 1,
                hint: "Look at the differences between consecutive terms: +4, +6, +8, +10..."
            },
            {
                difficulty: 'challenging',
                prompt: "Solve for x where: x² - 5x + 6 = 0, and x > 2",
                options: ["x = 2", "x = 3", "x = 5", "x = 1"],
                correctIndex: 1,
                hint: "Factor the quadratic equation into (x - 2)(x - 3) = 0."
            }
        ],
        code: [
            {
                difficulty: 'easy',
                prompt: "Which line in this Python code will throw a TypeError?<br><pre class='code-block'>1: name = \"Alex\"\n2: age = 25\n3: details = name + \" is \" + age + \" years old\"\n4: print(details)</pre>",
                options: ["Line 1", "Line 2", "Line 3", "Line 4"],
                correctIndex: 2,
                hint: "In Python, you cannot directly concatenate a string and an integer. You must cast the integer to a string using str()."
            },
            {
                difficulty: 'normal',
                prompt: "Identify the critical flaw in this average calculator function:<br><pre class='code-block'>def get_avg(nums):\n    total = 0\n    for n in nums:\n        total += n\n    return total / len(nums)</pre>",
                options: [
                    "It will cause a division by zero if nums is empty",
                    "It only accepts integer arguments",
                    "It returns total division instead of floats",
                    "The loop will crash on strings"
                ],
                correctIndex: 0,
                hint: "Consider what happens if the input list 'nums' is empty []. The length, len(nums), will be 0, causing a ZeroDivisionError."
            },
            {
                difficulty: 'challenging',
                prompt: "What is the primary bug in this asynchronous JavaScript code?<br><pre class='code-block'>async function fetchUser(url) {\n    let user;\n    fetch(url).then(res => res.json()).then(data => {\n        user = data;\n    });\n    return user;\n}</pre>",
                options: [
                    "Fetch cannot parse JSON in async functions",
                    "It returns 'undefined' because the fetch completes asynchronously after the return",
                    "The user variable needs to be declared as const",
                    "Syntax error inside the .then handler"
                ],
                correctIndex: 1,
                hint: "The inner fetch is asynchronous. The return statement runs immediately, before the fetch promises complete. You should await the fetch promise."
            }
        ],
        reading: [
            {
                difficulty: 'easy',
                prompt: "Read this passage and identify the main benefit of WebSockets:<br><div class='reading-passage'>WebSockets allow for a persistent TCP connection between a client and a server. Unlike traditional HTTP where the client must request updates, WebSockets enable bi-directional, full-duplex communication, allowing the server to push updates instantly.</div>",
                options: [
                    "They consume less memory on client devices",
                    "They allow the server to push updates instantly without client polling",
                    "They replace HTTPS encryption standards",
                    "They run faster in older browsers"
                ],
                correctIndex: 1,
                hint: "Read the last sentence carefully: 'enable bi-directional communication, allowing the server to push updates instantly'."
            },
            {
                difficulty: 'normal',
                prompt: "According to the passage, what is the role of JavaScript event loops?<br><div class='reading-passage'>The JavaScript runtime uses an Event Loop to handle asynchronous operations. Because JS is single-threaded, it delegates blocking operations (like disk reads or API requests) to the browser's WebAPIs. When completed, these callbacks are queued in the Task Queue and executed when the main execution stack is empty.</div>",
                options: [
                    "To allocate CPU threads to perform math in parallel",
                    "To continuously execute blocking filesystem checks",
                    "To fetch callbacks from the Task Queue and push them to the call stack once it is empty",
                    "To compile source code into machine binary language"
                ],
                correctIndex: 2,
                hint: "Look for what happens when 'the main execution stack is empty' and how tasks from the queue are processed."
            },
            {
                difficulty: 'challenging',
                prompt: "What is the key mechanism of CSS Grid layout subgrids?<br><div class='reading-passage'>CSS Grid introduced the subgrid value for grid-template-rows or grid-template-columns. When a nested grid item is declared as grid-template: subgrid, it inherits the row and column tracks of its parent layout. This allows nested card items to align perfectly along parent grids, bypassing traditional containment constraints.</div>",
                options: [
                    "Subgrids allow items to auto-size based on screen widths",
                    "They let nested elements align directly to the parent grid structure",
                    "They override the flex-direction rules of parent flexboxes",
                    "They duplicate the grid borders onto child wrappers"
                ],
                correctIndex: 1,
                hint: "Focus on how 'it inherits the row and column tracks of its parent layout' to achieve perfect alignment."
            }
        ]
    },

    // Inactivity / Boredom booster puzzle config
    boosterPuzzle: {
        equation: "9 * 8 - 14",
        answer: 58
    },

    /**
     * Initializes the support engine indicators
     */
    init() {
        this.resetStats();
    },

    resetStats() {
        this.interventionCount = 0;
        this.streakCount = 0;
        this.multiplier = 1.0;
        this.stressIncidentCounter = 0;
        this.boredomIncidentCounter = 0;
        this.activeIntervention = null;
        
        const badgeInterv = document.getElementById('intervention-count');
        const badgeStreak = document.getElementById('streak-multiplier');
        if (badgeInterv) badgeInterv.textContent = '0';
        if (badgeStreak) badgeStreak.innerHTML = '<i class="fa-solid fa-fire"></i> 1.0x';
    },

    /**
     * Receives live telemetries from detector.js and applies adaptive support rules
     */
    processTelemetry(data) {
        if (this.activeIntervention) return; // ignore during breaks
        
        const flowStatusBadge = document.getElementById('current-flow-status');
        
        // 1. Calculate general flow state UI label
        if (data.stress > 60) {
            flowStatusBadge.textContent = "High Load";
            flowStatusBadge.className = "val state-stress";
        } else if (data.focus > 75) {
            flowStatusBadge.textContent = "Flow State";
            flowStatusBadge.className = "val state-focus";
        } else if (data.boredom > 65) {
            flowStatusBadge.textContent = "Distracted";
            flowStatusBadge.className = "val state-alert";
        } else {
            flowStatusBadge.textContent = "Steady";
            flowStatusBadge.className = "val state-neutral";
        }

        // 2. CHECK ADAPTIVE INTERVENTIONS
        // Stress Interventions: If user displays elevated frustration (stress > 65) for 5 updates (~1 second of sustained frustration)
        if (data.stress > 65 || (window.Sentiment && window.Sentiment.typingStress === 'high')) {
            this.stressIncidentCounter++;
            if (this.stressIncidentCounter > 10) { // Sustained stress ~2 seconds
                this.triggerBreathingIntervention();
            }
        } else {
            this.stressIncidentCounter = Math.max(0, this.stressIncidentCounter - 1);
        }

        // Boredom Interventions: If user is neutral/disengaged (boredom > 75) for 35 updates (~7 seconds)
        if (data.boredom > 75 && !data.facePresent && !window.Sentiment.isTyping()) {
            this.boredomIncidentCounter++;
            if (this.boredomIncidentCounter > 35) {
                this.triggerBoosterIntervention();
            }
        } else {
            this.boredomIncidentCounter = Math.max(0, this.boredomIncidentCounter - 1);
        }

        // 3. Peak Flow State Celebration (Confetti)
        // If user hits >85 focus for sustained periods, increment streak
        if (data.focus > 85 && data.facePresent) {
            this.streakCount++;
            if (this.streakCount === 100) { // sustained focus
                this.triggerFlowConfetti();
            }
        } else {
            this.streakCount = Math.max(0, this.streakCount - 0.5);
        }

        // Live dynamic hint unlock criteria: if stress is > 45, enable hint button
        const hintBtn = document.getElementById('btn-hint');
        if (hintBtn) {
            if (data.stress > 45 || this.currentDifficulty === 'easy') {
                hintBtn.disabled = false;
                hintBtn.innerHTML = `<i class="fa-solid fa-lightbulb"></i> Unlock Hint`;
            } else {
                hintBtn.disabled = true;
                hintBtn.innerHTML = `<i class="fa-solid fa-lightbulb"></i> Unlock Hint (Unlockable at high stress)`;
            }
        }
    },

    /**
     * Positive feedback Confetti triggers
     */
    triggerFlowConfetti() {
        console.log("MindFlow Support: Peak Focus Detected! Launching Confetti.");
        this.multiplier = parseFloat((this.multiplier + 0.2).toFixed(1));
        
        const badgeStreak = document.getElementById('streak-multiplier');
        if (badgeStreak) {
            badgeStreak.innerHTML = `<i class="fa-solid fa-fire"></i> ${this.multiplier}x`;
            badgeStreak.style.color = 'var(--color-success)';
            setTimeout(() => badgeStreak.style.color = '', 2000);
        }

        // Run client-side canvas confetti
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.8 },
                colors: ['#6366f1', '#8b5cf6', '#10b981']
            });
        }
        
        if (window.App && window.App.logEvent) {
            window.App.logEvent("Engine", "Flow state milestone reached. Confetti reinforcement triggered.", "Normal");
        }
    },

    /**
     * Intervention 1: Guided Breathing Exercise
     */
    triggerBreathingIntervention() {
        this.activeIntervention = 'breathing';
        this.stressIncidentCounter = 0;
        this.interventionCount++;
        
        const overlay = document.getElementById('breathing-intervention-overlay');
        const countBadge = document.getElementById('intervention-count');
        if (overlay) overlay.classList.add('active');
        if (countBadge) countBadge.textContent = this.interventionCount;

        if (window.App && window.App.logEvent) {
            window.App.logEvent("Engine", "High cognitive stress detected. Triggering deep-breathing intervention.", "Stressed");
        }

        // Start breathing cycles
        const circle = document.getElementById('breathing-circle');
        const text = document.getElementById('breathing-text');
        let cycle = 0;

        const breatheCycle = () => {
            if (!this.activeIntervention || this.activeIntervention !== 'breathing') return;
            
            if (cycle >= 2) {
                // Done with 2 cycles (~16 seconds)
                this.closeInterventions();
                
                // Adapt workspace: downgrade difficulty and unlock hints
                this.adaptDifficulty('easy');
                return;
            }

            // Inhale
            if (circle) circle.classList.add('inhale');
            if (text) text.textContent = "Inhale";
            
            setTimeout(() => {
                if (this.activeIntervention !== 'breathing') return;
                // Hold
                if (text) text.textContent = "Hold";
                
                setTimeout(() => {
                    if (this.activeIntervention !== 'breathing') return;
                    // Exhale
                    if (circle) circle.classList.remove('inhale');
                    if (text) text.textContent = "Exhale";
                    
                    setTimeout(() => {
                        cycle++;
                        breatheCycle();
                    }, 4000);
                }, 1000);
            }, 4000);
        };

        breatheCycle();
    },

    skipBreathing() {
        this.closeInterventions();
        // Skip breathing still adapts the level to help the user
        this.adaptDifficulty('easy');
    },

    /**
     * Intervention 2: Boredom / Attention Booster Game
     */
    triggerBoosterIntervention() {
        this.activeIntervention = 'booster';
        this.boredomIncidentCounter = 0;
        this.interventionCount++;
        
        const overlay = document.getElementById('booster-intervention-overlay');
        const countBadge = document.getElementById('intervention-count');
        const puzzleArea = document.getElementById('booster-puzzle-area');
        
        if (countBadge) countBadge.textContent = this.interventionCount;

        // Generate rapid puzzle
        const num1 = Math.floor(Math.random() * 8) + 3; // 3 to 10
        const num2 = Math.floor(Math.random() * 8) + 3;
        const addNum = Math.floor(Math.random() * 15) + 5;
        this.boosterPuzzle = {
            equation: `${num1} * ${num2} + ${addNum}`,
            answer: num1 * num2 + addNum
        };

        if (puzzleArea) {
            puzzleArea.innerHTML = `
                <div class="booster-equation">${this.boosterPuzzle.equation} = ?</div>
                <input type="number" id="booster-answer-input" class="booster-input" placeholder="...">
            `;
        }

        if (overlay) overlay.classList.add('active');
        
        setTimeout(() => {
            const input = document.getElementById('booster-answer-input');
            if (input) input.focus();
        }, 100);

        if (window.App && window.App.logEvent) {
            window.App.logEvent("Engine", "Boredom/Distraction detected. Triggering focus booster quiz.", "Bored");
        }
    },

    submitBooster() {
        const input = document.getElementById('booster-answer-input');
        if (!input) return;
        
        const userAnswer = parseInt(input.value);
        if (userAnswer === this.boosterPuzzle.answer) {
            // Correct answer confetti and reset multipliers
            this.closeInterventions();
            this.triggerFlowConfetti();
            
            if (window.App && window.App.logEvent) {
                window.App.logEvent("System", "Focus booster solved correctly. Streak boosted.", "Focused");
            }
        } else {
            // Shake overlay
            const card = document.querySelector('.booster-card');
            if (card) {
                card.style.animation = 'none';
                card.offsetHeight; // trigger reflow
                card.style.animation = 'scaleUp 0.3s ease-out';
                card.style.border = '1px solid var(--color-error)';
            }
        }
    },

    closeInterventions() {
        this.activeIntervention = null;
        const o1 = document.getElementById('breathing-intervention-overlay');
        const o2 = document.getElementById('booster-intervention-overlay');
        if (o1) o1.classList.remove('active');
        if (o2) o2.classList.remove('active');
        
        // Reset timers
        this.stressIncidentCounter = 0;
        this.boredomIncidentCounter = 0;
    },

    /**
     * Adapt engine level to suit user cognitive strain
     */
    adaptDifficulty(targetDiff) {
        if (this.currentDifficulty === targetDiff) return;
        
        this.currentDifficulty = targetDiff;
        const tag = document.getElementById('difficulty-tag');
        if (tag) {
            tag.textContent = targetDiff.charAt(0).toUpperCase() + targetDiff.slice(1);
            if (targetDiff === 'easy') {
                tag.className = 'status-tag adaptive-alert';
            } else if (targetDiff === 'challenging') {
                tag.className = 'status-tag adaptive-stress';
            } else {
                tag.className = 'status-tag';
            }
        }

        // Re-generate current question index to match new difficulty
        this.loadCurrentQuestion();
        
        if (window.App && window.App.logEvent) {
            window.App.logEvent("Engine", `Adaptive Engine scaled complexity to: ${targetDiff.toUpperCase()}`, "Normal");
        }
    },

    /**
     * Study Workspace Navigation
     */
    startModule(moduleKey) {
        this.currentModule = moduleKey;
        this.currentDifficulty = 'normal'; // reset level on new module
        this.currentQuestionIndex = 0;
        this.selectedOption = null;
        
        // Toggle view
        document.getElementById('screen-welcome').classList.remove('active');
        document.getElementById('screen-module').classList.add('active');
        
        // Set titles
        const titles = {
            logic: "Math & Logic Tasks",
            code: "Code Debugging Arena",
            reading: "Speed Reading Comprehension"
        };
        document.getElementById('module-title').textContent = titles[moduleKey] || "Module";
        
        // Set Difficulty tag
        const tag = document.getElementById('difficulty-tag');
        if (tag) {
            tag.textContent = "Normal";
            tag.className = 'status-tag';
        }

        this.loadCurrentQuestion();
    },

    exitModule() {
        this.currentModule = null;
        document.getElementById('screen-module').classList.remove('active');
        document.getElementById('screen-welcome').classList.add('active');
    },

    loadCurrentQuestion() {
        if (!this.currentModule) return;
        
        const dataSet = this.modules[this.currentModule];
        // find question matching current difficulty
        const qData = dataSet.find(q => q.difficulty === this.currentDifficulty) || dataSet[0];
        
        const displayArea = document.getElementById('module-display-area');
        this.selectedOption = null;
        
        // Disable hint elements
        const hintBox = document.getElementById('module-hint-box');
        if (hintBox) hintBox.remove();
        
        if (this.currentModule === 'logic') {
            displayArea.innerHTML = `
                <div class="logic-task">
                    <p class="question-prompt">${qData.prompt}</p>
                    <div class="options-grid">
                        ${qData.options.map((opt, idx) => `
                            <button class="option-btn" onclick="Learning.selectOption(${idx})">${opt}</button>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (this.currentModule === 'code') {
            displayArea.innerHTML = `
                <div class="code-task">
                    <p>${qData.prompt}</p>
                    <div class="options-grid">
                        ${qData.options.map((opt, idx) => `
                            <button class="option-btn" onclick="Learning.selectOption(${idx})">${opt}</button>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (this.currentModule === 'reading') {
            displayArea.innerHTML = `
                <div class="reading-task">
                    <p>${qData.prompt}</p>
                    <div class="options-grid">
                        ${qData.options.map((opt, idx) => `
                            <button class="option-btn" onclick="Learning.selectOption(${idx})">${opt}</button>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    },

    selectOption(index) {
        this.selectedOption = index;
        const btns = document.querySelectorAll('.option-btn');
        btns.forEach((btn, idx) => {
            if (idx === index) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    },

    requestHint() {
        const dataSet = this.modules[this.currentModule];
        const qData = dataSet.find(q => q.difficulty === this.currentDifficulty) || dataSet[0];
        
        // Check if hint is already displayed
        if (document.getElementById('module-hint-box')) return;

        const displayArea = document.getElementById('module-display-area');
        const hintDiv = document.createElement('div');
        hintDiv.className = 'hint-container';
        hintDiv.id = 'module-hint-box';
        hintDiv.innerHTML = `
            <i class="fa-solid fa-circle-info" style="margin-top: 2px;"></i>
            <div><strong>Adaptive Hint:</strong> ${qData.hint}</div>
        `;
        displayArea.appendChild(hintDiv);
        
        if (window.App && window.App.logEvent) {
            window.App.logEvent("Engine", "Student unlocked hints due to high stress calibration.", "Normal");
        }
    },

    submitAnswer() {
        if (this.selectedOption === null) return;
        
        const dataSet = this.modules[this.currentModule];
        const qData = dataSet.find(q => q.difficulty === this.currentDifficulty) || dataSet[0];
        
        const isCorrect = this.selectedOption === qData.correctIndex;
        
        if (isCorrect) {
            // Correct answer
            if (typeof confetti === 'function') {
                confetti({ particleCount: 30, spread: 40, origin: { y: 0.7 } });
            }
            
            // Log score update
            if (window.App) {
                window.App.successScore += Math.round(10 * this.multiplier);
            }
            
            // Adapt workspace: if user gets challenging correct or normal correct, increase level
            if (this.currentDifficulty === 'easy') {
                this.adaptDifficulty('normal');
            } else if (this.currentDifficulty === 'normal') {
                this.adaptDifficulty('challenging');
            } else {
                this.triggerFlowConfetti(); // double confetti
            }

            if (window.App && window.App.logEvent) {
                window.App.logEvent("System", `Correct answer submitted for ${this.currentModule} task.`, "Focused");
            }
            
            // return to module select
            this.exitModule();
            
        } else {
            // Wrong answer
            const activeBtn = document.querySelector('.option-btn.selected');
            if (activeBtn) {
                activeBtn.style.background = 'rgba(239, 68, 68, 0.15)';
                activeBtn.style.borderColor = 'var(--color-error)';
            }
            
            // Deduct streak multiplier
            this.multiplier = Math.max(1.0, parseFloat((this.multiplier - 0.1).toFixed(1)));
            const badgeStreak = document.getElementById('streak-multiplier');
            if (badgeStreak) {
                badgeStreak.innerHTML = `<i class="fa-solid fa-fire"></i> ${this.multiplier}x`;
            }

            // Adapt workspace: ease difficulty
            this.adaptDifficulty('easy');
            
            if (window.App && window.App.logEvent) {
                window.App.logEvent("System", `Incorrect answer submitted for ${this.currentModule} task. Complexity downgraded.`, "Stressed");
            }
        }
    }
};

// Export to window
window.Learning = Learning;
