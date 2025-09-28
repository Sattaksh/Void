// netlify/functions/ask-ai.js
const fetch = require('node-fetch');

exports.handler = async function (event) {
    const { question, imageBase64, imageMimeType } = JSON.parse(event.body);
    const { GEMINI_API_KEY } = process.env;

    const modelName = 'gemini-2.5-flash-lite-preview-09-2025'; // Using the stable multimodal model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    
    const parts = [{ text: question || "Describe this image in detail." }];

    if (imageBase64 && imageMimeType) {
        parts.unshift({
            inline_data: { mime_type: imageMimeType, data: imageBase64 }
        });
    }

    try {
        const geminiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }] })
        });
        
        const geminiData = await geminiResponse.json();

        if (!geminiResponse.ok || !geminiData.candidates) {
            console.error("Gemini API Error:", geminiData);
            throw new Error('Failed to get a valid response from Gemini API');
        }

        const aiText = geminiData.candidates[0].content.parts[0].text;
        
        return {
            statusCode: 200,
            body: JSON.stringify({ answer: aiText }) // We send back a simple object
        };
    } catch (error) {
        console.error("Server Function Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
