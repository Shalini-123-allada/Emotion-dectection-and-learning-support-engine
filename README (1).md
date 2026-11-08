# MindFlow: AI-Powered Emotion & Learning Support Engine

MindFlow is a premium, privacy-first single-page web application that tracks a learner's emotional state in real-time (using client-side facial expression analysis, text sentiment, and typing telemetry) and dynamically adapts the learning environment.

The system is designed to optimize focus, reduce frustration, and maintain a healthy learning flow state by intervening with adaptive support mechanism overlays when the student gets stuck or disengaged.

---

## 🌟 Key Features

*   **Real-time Webcam Emotion Tracking**: Runs client-side face detection and expression classification in the browser using `@vladmandic/face-api` (built on TensorFlow.js).
*   **Keystroke Telemetry & Sentiment**: Analyzes typing speed (Words Per Minute), key hesitations, and error rates (backspaces pressed) as stress proxies. It also evaluates note-taking sentiment using lightweight client-side keyword matches.
*   **Adaptive Support Engine**:
    *   *Frustration Interventions*: Automatically detects stress spikes and launches a guided breathing break overlay, while automatically easing quiz difficulty or unlocking helpful tips.
    *   *Boredom/Distraction Boosters*: Recognizes extended disengagement and displays rapid-fire logic mini-games to re-alert the user's attention.
    *   *Confetti Milestones*: Celebrates sustained flow state peaks with canvas confetti micro-animations.
*   **Rich Analytics Dashboard**: Live trends charts of Focus vs. Stress using Chart.js, aggregate emotion profiles, and a complete Empathy Intervention Log tracking engine modifications.
*   **100% Privacy Preserved**: All processing occurs locally on the client's machine. Webcam streams and keystrokes are processed in sandbox memory and are **never** uploaded to external servers.

---

## 🛠️ Tech Stack & Libraries

1.  **Core UI**: HTML5 & Vanilla JavaScript (ES Module patterns).
2.  **Styling**: CSS3 Vanilla Glassmorphism (blurry backdrops, custom dark theme, neon glows).
3.  **ML Engine**: [face-api.js (Vladmandic bundle)](https://github.com/vladmandic/face-api) - loads weights from jsDelivr CDN.
4.  **Data Visualization**: [Chart.js (v4.x)](https://www.chartjs.org/) - custom stylized dark layouts.
5.  **Micro-animations**: [Canvas-Confetti](https://github.com/catdad/canvas-confetti) - reward notifications.

---

## 📂 Repository Structure

```text
├── index.html          # Semantic layout, loads CDN frameworks, structures views
├── styles.css          # Core glassmorphic theme styling & transitions
├── app.js              # Coordinator managing webcam streams & logging
├── detector.js         # face-api loading, face tracker, & focus math logic
├── sentiment.js        # Keystroke telemetry & keyword sentiment detector
├── learning.js         # Adaptive task worksheets & support interventions
├── charts.js           # ChartJS line/doughnut/bar layout configs
└── README.md           # This project guide documentation
```

---

## 🚀 Quick Start / Local Setup

Because MindFlow is fully client-side, it has **zero npm dependencies to install**. However, to avoid CORS browser security restrictions when utilizing webcam WebRTC capabilities, you should serve it via a local HTTP server:

### Option A: Using Python (Simplest)
If you have Python installed, open your terminal in this project directory and run:
```bash
python -m http.server 8000
```
Then navigate to: `http://localhost:8000` in Google Chrome or Microsoft Edge.

### Option B: Using Node (npx)
If you have Node.js installed, run:
```bash
npx serve
```
Then open the browser URL shown in your terminal.

### Option C: VS Code Live Server
1. Open this folder in VS Code.
2. Install the **Live Server** extension.
3. Click the **Go Live** button in the bottom right status bar.

---

## 💡 How It Works (Emotion Detection Details)

1.  **TinyFaceDetector**: Locates the boundary of the face on the video frame.
2.  **FaceExpressionNet**: Predicts a probability distribution across 7 emotions: `happy`, `sad`, `angry`, `fearful`, `neutral`, `surprised`, `disgusted`.
3.  **Focus Score Formula**: Calculates current engagement:
    $$\text{Focus} = (\text{neutral} \times 70) + (\text{happy} \times 100) + (\text{surprised} \times 60) - (\text{Stress Penalty} \times 0.3) - (\text{Boredom Penalty} \times 0.2)$$
4.  **Stress Score Formula**: Aggregates frustration flags:
    $$\text{Stress} = (\text{angry} \times 100) + (\text{fearful} \times 70) + (\text{sad} \times 50) + (\text{disgusted} \times 40)$$
5.  **Adaptive Calibration**: The system tracks these figures in real-time to adjust study cards between `Easy`, `Normal`, and `Challenging` dynamically.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
