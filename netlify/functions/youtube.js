// netlify/functions/youtube.js
const fetch = require('node-fetch');

exports.handler = async function (event) {
    // Get the search term from the frontend's URL
    const term = event.queryStringParameters.q;

    // Securely get the API key
    const { YOUTUBE_API_KEY } = process.env;

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(term)}&type=video&maxResults=3&key=${YOUTUBE_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Send the data back to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch from YouTube API' }) };
    }
};