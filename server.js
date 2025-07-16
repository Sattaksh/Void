// server.js - FINAL VERSION WITH GEMINI API

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
// We will dynamically import fetch inside each function

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- SECURELY GET KEYS FROM ENVIRONMENT ---
// We now load the GEMINI_API_KEY and remove the old OpenRouter one.
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- API PROXY ENDPOINTS ---

// AI Answer Endpoint - UPDATED FOR GEMINI API
app.post('/api/ask-ai', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const { question } = req.body; // We only need the question from the frontend

        // The model the user requested: gemini-2.0-flash-lite
        const modelName = 'gemini-2.0-flash-lite';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

        // The request body has a different structure for the Gemini API
        const requestBody = {
            contents: [{
                parts: [{
                    text: question
                }]
            }]
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            throw new Error(`Gemini API responded with status: ${response.status}`);
        }

        const data = await response.json();
        
        // Extract the text from Gemini's different response structure
        const aiText = data.candidates[0].content.parts[0].text;

        // Send back a response that the frontend can understand
        res.json({
            choices: [{
                message: {
                    content: aiText
                }
            }]
        });

    } catch (error) {
        console.error("Server Error in /api/ask-ai:", error);
        res.status(500).json({ error: 'Failed to fetch from Gemini API' });
    }
});

// YouTube Endpoint (This was working correctly and remains unchanged)
app.get('/api/youtube', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const term = req.query.q;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(term)}&type=video&maxResults=3&key=${YOUTUBE_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("YouTube Error:", error);
        res.status(500).json({ error: 'Failed to fetch from YouTube' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ VoidSearch proxy server running on http://localhost:${PORT}`);
});