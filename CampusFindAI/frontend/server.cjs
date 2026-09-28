const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

const distPath = path.join(__dirname, "dist");

app.get("/config.js", (_req, res) => {
    const config = {
        apiBaseUrl: process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || "",
        googleClientId: process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "",
    };

    res.type("application/javascript").set("Cache-Control", "no-store");
    res.send(`window.__CAMPUSFIND_CONFIG__ = ${JSON.stringify(config)};`);
});

app.use(express.static(distPath));

app.use((req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`CampusFindAI Frontend running on port ${PORT}`);
});