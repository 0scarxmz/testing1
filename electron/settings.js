const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class SettingsManager {
    constructor() {
        this.userDataPath = app.getPath('userData');
        this.settingsPath = path.join(this.userDataPath, 'settings.json');
        this.defaultSettings = {
            autoScreenshot: true
        };
        this.settings = this.loadSettings();
    }

    loadSettings() {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const data = fs.readFileSync(this.settingsPath, 'utf8');
                return { ...this.defaultSettings, ...JSON.parse(data) };
            }
        } catch (error) {
            console.error('[Settings] Failed to load settings:', error);
        }
        return { ...this.defaultSettings };
    }

    saveSettings() {
        try {
            fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
            return true;
        } catch (error) {
            console.error('[Settings] Failed to save settings:', error);
            return false;
        }
    }

    get(key) {
        return this.settings[key];
    }

    getAll() {
        return { ...this.settings };
    }

    set(key, value) {
        this.settings[key] = value;
        return this.saveSettings();
    }
}

module.exports = new SettingsManager();
