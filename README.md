# 🎯 DubiSnipe

> **Real-time, zero-disturbance background deal sniper for Dubizzle UAE.**

**DubiSnipe** is a premium, lightweight Google Chrome extension designed to help bargain hunters silently monitor Dubizzle UAE listings in the background. It searches for deals matching specific keywords and price limits, alerting you immediately with a custom audio chime and native desktop notifications the second a match goes live.

---

## ✨ Features

*   🚀 **Zero-Disturbance Background Scanning**: Opens a single standard tab silently in the background (`active: false`) which reloads every 30 seconds. Chrome treats it as an active tab and never puts it to sleep, ensuring continuous scanning without interrupting your work.
*   🛡️ **Smart Captcha/WAF Handling**: If Dubizzle triggers a security check, DubiSnipe pauses scanning and renames the tab to `⚠️ Solve Captcha! - DubiSnipe`. You can click on the tab, solve it in 5 seconds, and let it automatically go back to silent scanning.
*   🔍 **Native Server-Side Price Filtering**: Automatically translates your search bounds into Dubizzle's native query syntax (`&price__gte=` and `&price__lte=`). This forces the server to do the heavy lifting, loading pages faster and drastically reducing Captcha challenges.
*   💸 **Strict Price Parsing (No Installment False Positives)**: Uses a global regex context-aware inspector to parse card text. It checks a 30-character surrounding window for `/mo`, `finance`, or `installment` keywords to ignore monthly installments and capture only the real purchase price.
*   🔊 **Custom Sound Alerts**: Plays your custom sound alert (`task_completed_sound_#2-1779533040830.mp3`) using a programmatic Chrome Offscreen context. If the file is ever missing, it falls back to a synthesized crystal chime.
*   📋 **Unified Dashboard**: Displays all matched deals in a sleek, scrollable dark-mode dashboard inside the extension popup, sorted perfectly from **lowest to highest price** with single-click links to claim them.
*   ☕ **Community-Supported (Free Edition)**: 100% free to use with a built-in donation panel to buy the developer a coffee.

---

## 🛠️ Installation Guide

1.  **Clone or Download this Repository**:
    *   Click **Code > Download ZIP** or clone this repo to your local machine:
        ```bash
        git clone https://github.com/whtisusername/dubisnipe.git
        ```
2.  **Load the Extension in Google Chrome**:
    *   Open Chrome and go to `chrome://extensions/`.
    *   Enable **Developer mode** using the toggle switch in the top-right corner.
    *   Click **Load unpacked** in the top-left corner.
    *   Select the folder containing this extension's code.

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

---

## ☕ Support the Project

If **DubiSnipe** helped you score an incredible deal or saved you thousands of dirhams on your next purchase, consider buying me a coffee to support continued development and maintenance!

[💖 Buy Me a Coffee](https://buymeacoffee.com/dubisnipe)
