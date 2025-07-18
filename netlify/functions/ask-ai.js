// netlify/functions/ask-ai.js
const fetch = require('node-fetch');

exports.handler = async function (event) {
    const { question, imageBase64, imageMimeType } = JSON.parse(event.body);
    const { GEMINI_API_KEY } = process.env;

    // We must use a model that supports images, like gemini-1.5-flash
    const modelName = 'gemini-2.5-flash-lite-preview-06-17';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    
    // Build the request. It will always have a text part.
    const parts = [{ text: question || "Describe this image in detail." }];

    // If an image was sent, add it to the request.
    if (imageBase64 && imageMimeType) {
        parts.unshift({ // Add the image before the text
            inline_data: {
                mime_type: imageMimeType,
                data: imageBase64
            }
        });
    }

    try {
        const geminiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }] })
        });
        
        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json();
            console.error("Gemini API Error:", errorData);
            return { statusCode: 500, body: JSON.stringify(errorData) };
        }

        const geminiData = await geminiResponse.json();
        const aiText = geminiData.candidates[0].content.parts[0].text;
        
        // Send a simple response back to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ answer: aiText })
        };
    } catch (error) {
        console.error("Server Function Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch from Gemini API' }) };
    }
};