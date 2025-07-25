// netlify/functions/youtube.js
const fetch = require('node-fetch');

exports.handler = async function (event) {
    const term = event.queryStringParameters.q;
    const { YOUTUBE_API_KEY } = process.env;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(term)}&type=video&maxResults=3&key=${YOUTUBE_API_KEY}`;
    
    try {
        const youtubeResponse = await fetch(url);
        const youtubeData = await youtubeResponse.json();
        
        return {
            statusCode: 200,
            body: JSON.stringify(youtubeData) // Just forward the data
        };
    } catch (error) {
        console.error("YouTube Function Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch from YouTube API' }) };
    }
};