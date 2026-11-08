/* ==========================================================================
   MindFlow Analytics Charts (charts.js)
   Configures and updates real-time Chart.js instances with custom visual theme
   ========================================================================== */

const Charts = {
    trendChart: null,
    pieChart: null,
    barChart: null,
    
    // Limits
    maxDataPoints: 20,
    timeLabels: [],
    focusHistory: [],
    stressHistory: [],
    
    // Aggregates
    emotionAccumulator: {
        neutral: 0.01,
        happy: 0.01,
        sad: 0.01,
        angry: 0.01,
        fearful: 0.01,
        surprised: 0.01
    },
    
    // Duration logs (in updates count)
    stateDurations: {
        flow: 0,
        steady: 0,
        stressed: 0,
        distracted: 0
    },

    /**
     * Initializes all ChartJS instances
     */
    init() {
        this.resetHistory();
        
        // Define shared global configurations for consistent styling
        Chart.defaults.color = 'rgba(255, 255, 255, 0.55)';
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.font.size = 11;
        
        const gridConfig = {
            color: 'rgba(255, 255, 255, 0.04)',
            drawTicks: false
        };

        // 1. REAL-TIME FOCUS & STRESS TREND CHART
        const trendCtx = document.getElementById('focusTrendChart');
        if (trendCtx) {
            this.trendChart = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: this.timeLabels,
                    datasets: [
                        {
                            label: 'Focus Index',
                            data: this.focusHistory,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.05)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 4
                        },
                        {
                            label: 'Stress Index',
                            data: this.stressHistory,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.05)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: '#f8fafc',
                                font: { family: "'Outfit', sans-serif", weight: '500' }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(20, 18, 43, 0.95)',
                            titleColor: '#f8fafc',
                            bodyColor: '#e2e8f0',
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                            borderWidth: 1
                        }
                    },
                    scales: {
                        x: {
                            grid: gridConfig,
                            ticks: { maxTicksLimit: 8, color: 'rgba(255, 255, 255, 0.4)' }
                        },
                        y: {
                            min: 0,
                            max: 100,
                            grid: gridConfig,
                            ticks: { stepSize: 20, color: 'rgba(255, 255, 255, 0.4)' }
                        }
                    }
                }
            });
        }

        // 2. AGGREGATE EMOTIONS PIE CHART
        const pieCtx = document.getElementById('emotionPieChart');
        if (pieCtx) {
            this.pieChart = new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Neutral', 'Focused/Happy', 'Sad', 'Frustrated/Angry', 'Fearful', 'Surprised'],
                    datasets: [{
                        data: [1, 1, 1, 1, 1, 1],
                        backgroundColor: [
                            'rgba(148, 163, 184, 0.7)',  // Slate Gray
                            'rgba(16, 185, 129, 0.7)',  // Emerald Green
                            'rgba(59, 130, 246, 0.7)',  // Blue
                            'rgba(239, 68, 68, 0.7)',   // Red
                            'rgba(139, 92, 246, 0.7)',  // Violet
                            'rgba(245, 158, 11, 0.7)'   // Amber
                        ],
                        borderColor: 'rgba(20, 18, 43, 0.9)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: '#e2e8f0',
                                font: { size: 10 }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(20, 18, 43, 0.95)',
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                            borderWidth: 1
                        }
                    },
                    cutout: '65%'
                }
            });
        }

        // 3. STATE CATEGORY DURATION BAR CHART
        const barCtx = document.getElementById('flowBarChart');
        if (barCtx) {
            this.barChart = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: ['Flow State', 'Steady', 'High Load', 'Distracted'],
                    datasets: [{
                        label: 'Time Spent (seconds)',
                        data: [0, 0, 0, 0],
                        backgroundColor: [
                            'rgba(16, 185, 129, 0.75)', // Flow
                            'rgba(99, 102, 241, 0.75)', // Steady
                            'rgba(239, 68, 68, 0.75)',  // High Load
                            'rgba(245, 158, 11, 0.75)'  // Distracted
                        ],
                        borderColor: [
                            '#10b981', '#6366f1', '#ef4444', '#f59e0b'
                        ],
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(20, 18, 43, 0.95)',
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                            borderWidth: 1
                        }
                    },
                    scales: {
                        x: { grid: { display: false } },
                        y: {
                            grid: gridConfig,
                            beginAtZero: true,
                            ticks: { stepSize: 10 }
                        }
                    }
                }
            });
        }
    },

    resetHistory() {
        this.timeLabels.length = 0;
        this.focusHistory.length = 0;
        this.stressHistory.length = 0;
        
        for (let i = 0; i < this.maxDataPoints; i++) {
            this.timeLabels.push("");
            this.focusHistory.push(50);
            this.stressHistory.push(0);
        }

        this.emotionAccumulator = { neutral: 0.01, happy: 0.01, sad: 0.01, angry: 0.01, fearful: 0.01, surprised: 0.01 };
        this.stateDurations = { flow: 0, steady: 0, stressed: 0, distracted: 0 };
    },

    /**
     * Pushes real-time points onto the streaming line graph
     */
    pushTrend(focusVal, stressVal) {
        // Shift old values
        this.focusHistory.shift();
        this.stressHistory.shift();
        this.timeLabels.shift();
        
        // Append new values
        this.focusHistory.push(focusVal);
        this.stressHistory.push(stressVal);
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.timeLabels.push(timestamp);
        
        // Update Chart
        if (this.trendChart) {
            this.trendChart.update('none'); // Update without full redraw animation for smoothness
        }
    },

    /**
     * Accumulates emotion readings to show aggregate distributions
     */
    accumulateEmotions(emotions) {
        const { neutral, happy, sad, angry, fearful, surprised, disgusted } = emotions;
        
        // Accumulate (disgusted is grouped with angry for simplicity in pie chart)
        this.emotionAccumulator.neutral += neutral || 0;
        this.emotionAccumulator.happy += happy || 0;
        this.emotionAccumulator.sad += sad || 0;
        this.emotionAccumulator.angry += (angry || 0) + (disgusted || 0);
        this.emotionAccumulator.fearful += fearful || 0;
        this.emotionAccumulator.surprised += surprised || 0;
        
        // Sum total to represent shares
        const total = Object.values(this.emotionAccumulator).reduce((a, b) => a + b, 0);
        
        if (this.pieChart) {
            const dataShares = Object.values(this.emotionAccumulator).map(val => Math.round((val / total) * 100));
            this.pieChart.data.datasets[0].data = dataShares;
            this.pieChart.update();
        }
    },

    /**
     * Accumulates durations user spent in different cognitive states
     */
    accumulateDurations(focus, stress, boredom) {
        // Each tick represents 200ms or 1 update. 5 updates is ~1 second.
        const tick = 0.2; 
        
        if (stress > 60) {
            this.stateDurations.stressed += tick;
        } else if (focus > 75) {
            this.stateDurations.flow += tick;
        } else if (boredom > 65) {
            this.stateDurations.distracted += tick;
        } else {
            this.stateDurations.steady += tick;
        }

        if (this.barChart) {
            // Display values formatted to nearest integer seconds
            this.barChart.data.datasets[0].data = [
                Math.round(this.stateDurations.flow),
                Math.round(this.stateDurations.steady),
                Math.round(this.stateDurations.stressed),
                Math.round(this.stateDurations.distracted)
            ];
            this.barChart.update();
        }
    }
};

window.Charts = Charts;
