// netlify/functions/ask-ai.js
const fetch = require('node-fetch');

exports.handler = async function (event) {
    // Get the question from the frontend request
    const { question } = JSON.parse(event.body);

    // Securely get the API key from Netlify's settings
    const { GEMINI_API_KEY } = process.env;

    const modelName = 'gemini-2.0-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: question }] }] })
        });

        if (!response.ok) {
            return { statusCode: 500, body: "Error from Gemini API" };
        }

        const data = await response.json();

        // Send the data back to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch from Gemini API' }) };
    }
};