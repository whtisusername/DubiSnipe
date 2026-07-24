# 🎯 DubiSnipe

> **Real-time, zero-disturbance background deal sniper for Dubizzle UAE.**

**DubiSnipe** is a premium, lightweight Google Chrome extension designed to help bargain hunters silently monitor Dubizzle UAE listings in the background. It searches for deals matching specific keywords and price limits, alerting you immediately with a custom audio chime and native desktop notifications the second a match goes live.

---

## 🆕 What's New in V1.2
*   🩹 **Reliable Stop/Start State**: The popup now always reflects reality. If the background scanner window is closed (manually, by a WAF block, or by Chrome discarding it), the extension detects it, resets cleanly, and shows the Start button again instead of getting stuck on a fake "Scanning..." state.
*   🚨 **Broken-Scraper Detection**: If the scanner extracts **0 listings several cycles in a row** (a sign Dubizzle changed its page layout or you're being soft-blocked), the status panel now warns you explicitly, instead of silently reporting "0 matches" forever.
*   📟 **Live Status Panel**: A real-time scanner status readout in the popup showing scan counts, timestamps, and captcha/WAF prompts.
*   🧹 **Tidy Permissions**: Removed an unused host permission to keep the extension's footprint minimal.

---

## ✨ Features & Architecture Modes

DubiSnipe is designed with two release flavors depending on how you prefer to handle Chrome window management:

### 🌟 V1.1 (Latest / `main` branch) - Native Minimized Window & Auto-Sliding WAF Captcha
*   🚀 **Native Minimized Background Window**: On clicking **Start**, DubiSnipe launches a native, isolated browser window in a minimized state. It lives quietly in your Dock/Taskbar, completely out of your focus and sight.
*   🛡️ **Auto-Sliding WAF Captcha handling**: If Dubizzle triggers an Imperva WAF challenge, DubiSnipe detects it instantly, restores the window back to active screen view `(100, 100)`, and alerts you to solve the Captcha. Once you solve it, the window **automatically slides back down** and minimizes into the Dock to continue scanning!
*   ⚡ **Zero-Suspension Throttling Bypass**: Even when minimized, the scanner page forces a reload every 30 seconds, keeping the tab constantly active and avoiding background service suspension.

### 🍃 V1.0 (Stable / `v1.0.0-stable` branch) - Standard Inactive Tab Scanner
*   🪶 **Standard Background Tab Scraper**: Opens a standard, inactive tab in your active browser window (`active: false`) which reloads every 30 seconds. Extremely simple, lightweight, and robust.
*   🧩 **Manual Captcha Resolution**: If a Captcha occurs, you simply click on the background tab in your active browser window, solve it in 5 seconds, and let it go back to silent background scanning.

---

## 💎 Core Capabilities (Both Versions)
*   🔍 **Native Server-Side Price Filtering**: Automatically translates your search bounds into Dubizzle's native query syntax (`&price__gte=` and `&price__lte=`). This forces the server to do the heavy lifting, loading pages faster and drastically reducing Captcha challenges.
*   💸 **Strict Price Parsing (No Installment False Positives)**: Uses a global regex context-aware inspector to parse card text. It checks a 30-character surrounding window for `/mo`, `finance`, or `installment` keywords to ignore monthly installments and capture only the real purchase price.
*   🔊 **Custom Sound Alerts**: Plays your custom sound alert (`task_completed_sound_#2-1779533040830.mp3`) using a programmatic Chrome Offscreen context. If the file is ever missing, it falls back to a synthesized crystal chime.
*   📋 **Unified Dashboard**: Displays all matched deals in a sleek, scrollable dark-mode dashboard inside the extension popup, sorted perfectly from **lowest to highest price** with single-click links to claim them.
*   🆓 **100% Free & Open-Source**: Free to use with zero ads, tracking, or premium subscription paywalls.

---

## 🛠️ Installation Guide

DubiSnipe is not on the Chrome Web Store. It installs as an **unpacked extension**, which takes about 30 seconds.

### ⭐ Recommended: Install from Release (for everyone)

1.  **Download the extension**: Go to the [**latest release**](https://github.com/whtisusername/DubiSnipe/releases/latest) and, under **Assets**, download **`DubiSnipe-v1.2.0.zip`** ([direct download](https://github.com/whtisusername/DubiSnipe/releases/latest/download/DubiSnipe-v1.2.0.zip)).
2.  **Unzip it**: Double-click the downloaded `.zip`. You'll get a folder named **`DubiSnipe`** containing the extension.
3.  **Open the extensions page**: In Chrome, go to `chrome://extensions/`.
4.  **Enable Developer mode**: Toggle it **on** using the switch in the top-right corner.
5.  **Load it**: Click **Load unpacked** (top-left) and select the unzipped **`DubiSnipe`** folder.
6.  **Pin it**: Click the puzzle-piece 🧩 icon in the toolbar and pin **DubiSnipe** so the 🎯 icon is always visible.

> **Note:** Keep the unzipped `DubiSnipe` folder somewhere permanent (e.g. your Documents). Chrome loads the extension *from that folder*, so if you delete or move it, the extension stops working. To update later, download the newer release and repeat, or click the ↻ reload icon on the DubiSnipe card in `chrome://extensions/`.

### 🧑‍💻 Alternative: Install from Source (for developers)

```bash
git clone https://github.com/whtisusername/DubiSnipe.git
```
Then follow steps 3–6 above, selecting the cloned **`DubiSnipe`** repository folder in the **Load unpacked** step.

---

## 🚀 How to Use

1.  Click the **DubiSnipe** extension icon in your Chrome toolbar to open the control dashboard.
2.  Enter a **Search Keyword** (e.g. `iphone 16` or `sennheiser`) OR paste a **Custom Dubizzle URL** with your category filters already applied.
3.  Set your **Min Price (AED)** and **Target/Max Price (AED)**.
4.  Click **Start Background Sniper**.
5.  *That's it!* A browser tab will open silently in the background. It will reload every 30 seconds.
6.  The second a matching deal is found, you will hear your custom chime play, a native desktop notification will pop up, and the deal will appear at the top of your list inside the extension dashboard!

---

## 💡 Captcha & WAF Best Practices

Because Dubizzle UAE uses **Imperva WAF (Web Application Firewall)** to block automated bots, follow these tips to ensure uninterrupted scanning:

1.  **Log In First**: Always sign in to a Dubizzle account in Chrome before starting the sniper. Imperva assigns a very high trust score to logged-in user profiles, heavily reducing Captchas.
2.  **Establish Trust Cookies**: Before starting the scanner, manually browse Dubizzle for 60 seconds (do a couple of searches, click a few listings). This fills your browser cache with standard human tracking cookies.
3.  **Solve the Handshake Captcha**: If a Captcha tab opens when you first start, solve it immediately. Once solved, Chrome saves a long-lived trust cookie that allows background scanning to run for hours uninterrupted.
4.  **Avoid Multi-Scanning**: Do not open multiple background sniper tabs at the same time. Doing so doubles the request rate from your IP, flagging the WAF's rate limiters.

