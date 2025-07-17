// netlify/functions/ask-ai.js
const fetch = require('node-fetch');

exports.handler = async function (event) {
    const { question } = JSON.parse(event.body);
    const { GEMINI_API_KEY } = process.env;
    const modelName = 'gemini-2.0-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    
    try {
        const geminiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: question }] }] })
        });
        const geminiData = await geminiResponse.json();
        
        // Directly extract the text we need
        const aiText = geminiData.candidates[0].content.parts[0].text;
        
        // Send back a simple JSON object that our frontend can easily use
        return {
            statusCode: 200,
            body: JSON.stringify({ answer: aiText })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch from Gemini API' }) };
    }
};