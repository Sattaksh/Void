document.addEventListener("DOMContentLoaded", () => {
  const q = id => document.getElementById(id);
  const searchBox = q("searchBox"), searchBtn = q("searchBtn"), voiceBtn = q("voiceBtn");
  const suggUL = q("suggestions"), results = q("results"), loading = q("loading");
  const historyUL = q("history"), clearHist = q("clearHistory"), themeTgl = q("themeToggle"), back2Top = q("backToTop");
  
  // 🔑 API Keys — INSERT YOURS HERE
  const YOUTUBE_API_KEY = 'AIzaSyBK4QCF1YFeGXCUNziWQI_md6O-QQw_q9E';

  // 🌗 Dark mode
  if (localStorage.theme === "dark") document.body.classList.add("dark");
  themeTgl.onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.theme = document.body.classList.contains("dark") ? "dark" : "light";
  };

  // 🎤 Voice search
  let recogniser;
  if ("webkitSpeechRecognition" in window) {
    recogniser = new webkitSpeechRecognition();
    recogniser.lang = "en-US";
    recogniser.onresult = e => {
      const transcript = e.results[0][0].transcript.trim();
      searchBox.value = transcript;
      triggerSearch(transcript);
    };
  } else voiceBtn.style.display = "none";

  voiceBtn.onclick = () => {
  recogniser?.start();

  const speakPrompt = document.getElementById("speakPrompt");
  speakPrompt.style.display = "block";
  requestAnimationFrame(() => {
    speakPrompt.classList.add("show");
  });

  setTimeout(() => {
    speakPrompt.classList.remove("show");
    setTimeout(() => {
      speakPrompt.style.display = "none";
    }, 400);
  }, 1500);
};

  // 🔍 Trigger search
  searchBtn.onclick = () => triggerSearch(searchBox.value.trim());
  searchBox.addEventListener("keypress", e => e.key === "Enter" && triggerSearch(searchBox.value.trim()));

  function triggerSearch(term) {
    if (!term) return;
    suggUL.innerHTML = "";
    saveHistory(term);
    fetchAll(term)
    detectAndFetchCricketMatch(term)
    detectAndFetchCricketPlayer(term);
  }

  // 📦 Fetch Wikipedia + Entity + YouTube + News
function classifyAndEnhance(title, summary) {
  const lower = summary.toLowerCase();
  const encoded = encodeURIComponent(title);

  if (lower.includes("singer") || lower.includes("vocalist") || lower.includes("playback singer")) {
    return {
      type: "singer",
      spotifyLink: `https://open.spotify.com/search/${encoded}`
    };
  } else if (lower.includes("film") || lower.includes("movie") || lower.includes("cinema") || lower.includes("directed by")) {
    return {
      type: "movie",
      imdbRating: "⭐ 8.4/10 (testing)", // Static for now
      imdbLink: `https://www.imdb.com/find?q=${encoded}`
    };
  } else if (lower.includes("actor") || lower.includes("actress")) {
    return {
      type: "actor",
      famousWorks: [
        `${title} – Famous Work 1`,
        `${title} – Famous Work 2`,
        `${title} – Famous Work 3`
      ],
      imdbLink: `https://www.imdb.com/find?q=${encoded}`
    };
  }
  return null;
}

async function fetchAll(term) {
  results.innerHTML = "";
  loading.classList.add("show");


  try {
    const wikiURL = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term.replace(/\s+/g, "_"))}`;
    const wikiRes = await fetch(wikiURL);
    if (!wikiRes.ok) throw "Wiki Not Found";
    const wikiData = await wikiRes.json();

    let entityType = null;
    if (wikiData.wikibase_item) {
      entityType = await fetchEntityType(wikiData.wikibase_item);
    }
    // 🧩 Additional Media Enrichment
    if (entityType === "human") {
      if (/singer|musician|vocalist/i.test(wikiData.description)) {
    // Embed Spotify
      results.innerHTML += `
      <div class="card">
        <h3>🎧 Listen on Spotify</h3>
        <iframe style="border-radius:12px" src="https://open.spotify.com/embed/search/${encodeURIComponent(term)}" width="100%" height="80" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"></iframe>
      </div>`;
   } else if (/actor|actress/i.test(wikiData.description)) {
    // Top 3 Famous Works from Wiki data
    const works = wikiData.extract.match(/known for[^.]+/i);
    if (works) {
      results.innerHTML += `
        <div class="card">
          <h3>🎬 Famous Works</h3>
          <p>${works[0]}</p>
        </div>`;
    }
  }
} else if (entityType === "film") {
  // IMDb Rating via unofficial OMDB API (or provide search link)

  const imdbSearchUrl = `https://www.imdb.com/find?q=${encodeURIComponent(term)}&s=tt`;
  results.innerHTML += `
    <div class="card">
      <h3>🎞 IMDb Info</h3>
      <p><a href="${imdbSearchUrl}" target="_blank">🔗 Search "${term}" on IMDb</a></p>
    </div>`;
}

    results.innerHTML += buildWikiCard(wikiData, term);

    const enhance = classifyAndEnhance(wikiData.title, wikiData.extract);
if (enhance) {
  let html = "";
  if (enhance.type === "singer") {
    html = `<div class="card"><h3>🎵 Spotify</h3><a href="${enhance.spotifyLink}" target="_blank">${wikiData.title} on Spotify</a></div>`;
  } else if (enhance.type === "movie") {
    html = `<div class="card">
              <h3>🎬 IMDb Info</h3>
              <p>Rating: ${enhance.imdbRating}</p>
              <a href="${enhance.imdbLink}" target="_blank">View on IMDb</a>
            </div>`;
  } else if (enhance.type === "actor") {
    html = `<div class="card">
              <h3>🎭 Famous Works</h3>
              <ul>${enhance.famousWorks.map(work => `<li>${work}</li>`).join("")}</ul>
              <a href="${enhance.imdbLink}" target="_blank">View on IMDb</a>
            </div>`;
  }
  results.innerHTML += html;
}


    if (!wikiData?.extract || wikiData.extract.length < 20) {
      suggestCorrection(term); // typo handling
    }

    // 🔧 FETCH all in parallel (NO aiHTML here!)
    const [ytHTML, cricketHTML, matchHTML] = await Promise.all([
      fetchYouTube(term),
      fetchCricketData(term),
      detectAndFetchCricketMatch(term)
    ]);

    if (cricketHTML) results.innerHTML += cricketHTML;
    if (matchHTML) results.innerHTML += matchHTML;
    if (ytHTML) results.innerHTML += ytHTML;

  } catch (err) {
    console.warn("Wikipedia fetch failed:", err);
    results.innerHTML = "";
    suggestCorrection(term);
  } finally {
    loading.classList.remove("show");
  }
}




  // 🧠 Detect Entity Type from Wikidata
  async function fetchEntityType(qid) {
    try {
      const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
      const data = await res.json();
      const entity = data.entities[qid];
      const P31 = entity.claims.P31?.[0]?.mainsnak.datavalue.value.id;
      return data.entities[P31]?.labels?.en?.value.toLowerCase() || null;
    } catch {
      return null;
    }
  }

  // 📄 Build Wiki Card (with news-wrapper container)
  function buildWikiCard(d, term) {
    const img = d.thumbnail?.source ? `<img src="${d.thumbnail.source}" alt="${d.title}">` : "";
    return `
      <div class="card">
        <h2>${d.title || term}</h2>
        <p>${d.extract || "No summary available."}</p>
        ${img}
        <a href="${d.content_urls.desktop.page}" target="_blank">Read on Wikipedia</a>
      </div>
      <div id="news-wrapper"></div>`;
  }

  // 🎥 Fetch YouTube Results
  async function fetchYouTube(term) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(term)}&type=video&maxResults=3&key=${YOUTUBE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.items) throw "No YouTube results";

      return `
        <div class="card">
          <h3>🎥 Related Videos</h3>
          <ul>
            ${data.items.map(v => `
              <li>
                <a href="https://www.youtube.com/watch?v=${v.id.videoId}" target="_blank">
                  ${v.snippet.title}
                </a>
              </li>`).join("")}
          </ul>
        </div>`;
    } catch {
      return "";
    }
  }
  
async function fetchCricketData(term) {
  const CRICKETDATA_API_KEY = '1aa8107e-869b-4a0f-92bd-4b562c00aa3a';
  let html = "";

  try {
    // 1️⃣ Fetch all players and find the closest match using partial term matching
    const searchURL = `https://api.cricapi.com/v1/players?apikey=${CRICKETDATA_API_KEY}&offset=0`;
    const searchRes = await fetch(searchURL);
    const searchData = await searchRes.json();
    const players = searchData.data || [];

    const matched = players.find(p => {
      const name = p.name?.toLowerCase() || "";
      return term.toLowerCase().split(" ").some(word => name.includes(word));
    });

    if (matched) {
      const playerURL = `https://api.cricapi.com/v1/players_info?apikey=${CRICKETDATA_API_KEY}&offset=0&id=${matched.id}`;
      const playerRes = await fetch(playerURL);
      const playerData = await playerRes.json();
      const p = playerData.data;

      html += `
        <div class="card">
          <h3>🏏 Player: ${p.name}</h3>
          <p><strong>Country:</strong> ${p.country}</p>
          <p><strong>Born:</strong> ${p.dateOfBirth}</p>
          <p><strong>Role:</strong> ${p.role}</p>
          <p><strong>Batting:</strong> ${p.battingStyle} | <strong>Bowling:</strong> ${p.bowlingStyle}</p>
        </div>`;
    }

    // 2️⃣ Fetch live matches and check if any loosely match the search term
    const matchListRes = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${CRICKETDATA_API_KEY}`);
    const matchList = await matchListRes.json();
    const matches = matchList.data || [];

    const relevant = matches.filter(m =>
      term.toLowerCase().split(" ").some(word =>
        m.name?.toLowerCase().includes(word)
      )
    );

    for (const match of relevant.slice(0, 2)) {
      const matchDetailURL = `https://api.cricapi.com/v1/match_info?apikey=${CRICKETDATA_API_KEY}&offset=0&id=${match.id}`;
      const matchRes = await fetch(matchDetailURL);
      const matchData = await matchRes.json();
      const m = matchData.data;
      const teams = m.teams?.join(" vs ") || m.name;
      const scores = m.score?.map(s => `<li>${s.inning}: ${s.runs}/${s.wickets} in ${s.overs} overs</li>`).join("") || "No scores available.";

      html += `
        <div class="card">
          <h3>📺 ${teams}</h3>
          <p><strong>Status:</strong> ${m.status}</p>
          <ul>${scores}</ul>
        </div>`;
    }

    return ""; // <- don’t show anything if it failed

  } catch (err) {
    console.error("Cricket API Error:", err);
    return "<p>Error fetching cricket data.</p>";
  }
}
async function detectAndFetchCricketMatch(term) {
  const cricketTerms = ["vs", "ipl", "t20", "odi", "test", "cricket", "match"];
  const isMatch = cricketTerms.some(t => term.toLowerCase().includes(t));
  if (!isMatch) return;

  try {
    const matchesRes = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=1aa8107e-869b-4a0f-92bd-4b562c00aa3a&offset=0`);
    const matches = (await matchesRes.json()).data || [];

    const match = matches.find(m => {
      const teams = (m.teams || []).map(t => t.toLowerCase()).join(" ");
      const name = (m.name || "").toLowerCase();
      return name.includes(term.toLowerCase()) || teams.includes(term.toLowerCase());
    });

    if (!match) {
    console.info("No matching live cricket match found.");
    return;
  }
    const scoreRes = await fetch(`https://api.cricapi.com/v1/match_info?apikey=1aa8107e-869b-4a0f-92bd-4b562c00aa3a&id=${match.id}`);
    const scoreData = await scoreRes.json();

    const score = scoreData.data.score || [];
    const teams = scoreData.data.teams?.join(" vs ") || match.name;
    const status = scoreData.data.status || "Status not available";

    results.innerHTML += `
      <div class="card">
        <h3>🏏 Live Cricket Score</h3>
        <strong>${teams}</strong><br>
        <p>${status}</p>
        ${score.map(s => `<p><strong>${s.inning}</strong>: ${s.r}/${s.w} in ${s.o} overs</p>`).join("")}
      </div>
    `;
  } catch {
    results.innerHTML += "<div class='card'><p>Error loading cricket score.</p></div>";
  }
}

async function detectAndFetchCricketPlayer(term) {
  try {
    const searchUrl = `https://api.cricapi.com/v1/players?apikey=1aa8107e-869b-4a0f-92bd-4b562c00aa3a&offset=0&search=${encodeURIComponent(term)}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.data || !searchData.data.length) return;

    const player = searchData.data[0];
    const playerId = player.id;

    const infoUrl = `https://api.cricapi.com/v1/players_info?apikey=1aa8107e-869b-4a0f-92bd-4b562c00aa3a&id=${playerId}`;
    const infoRes = await fetch(infoUrl);
    const infoData = await infoRes.json();
    const d = infoData.data;

    // Check for essential info before rendering
    if (!d.name || !d.country) return;

    const teams = Array.isArray(d.teams) ? d.teams.join(", ") : "-";

    const cardHTML = `
      <div class="card">
        <h3>🏏 Player Info: ${d.name}</h3>
        ${d.playerImg ? `<img src="${d.playerImg}" alt="${d.name}" style="width: 100px; border-radius: 8px;">` : ""}
        <p><strong>Country:</strong> ${d.country}</p>
        <p><strong>Date of Birth:</strong> ${d.dateOfBirth || "-"}</p>
        <p><strong>Role:</strong> ${d.role || "-"}</p>
        <p><strong>Batting Style:</strong> ${d.battingStyle || "-"}</p>
        <p><strong>Bowling Style:</strong> ${d.bowlingStyle || "-"}</p>
        <p><strong>Teams:</strong> ${teams}</p>
      </div>
    `;

    results.innerHTML += cardHTML;

  } catch (err) {
    console.warn("Failed to fetch cricket player info:", err);
  }
}
async function suggestCorrection(term) {
  console.log("✅ suggestCorrection() triggered for:", term);

  const url = `https://en.wikipedia.org/w/api.php?origin=*&action=opensearch&format=json&search=${encodeURIComponent(term)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("🔁 Suggestion API responded:", data);

    const suggestions = data[1].filter(s => s.toLowerCase() !== term.toLowerCase());

    if (suggestions.length) {
      const firstSuggestion = suggestions[0];
      console.log("💡 Suggesting correction for:", firstSuggestion);  // ✅ Add this line

      const suggestionHTML = `
        <div class="card" style="background:#fff3cd; border-left: 4px solid #ffc107;">
          <p>🤔 Did you mean 
            <a href="#" id="didYouMeanLink">${firstSuggestion}</a>?
          </p>
        </div>
      `;
      results.innerHTML += suggestionHTML;

      document.getElementById("didYouMeanLink").onclick = e => {
        e.preventDefault();
        searchBox.value = firstSuggestion;
        triggerSearch(firstSuggestion);
      };
    }
  } catch (err) {
    console.warn("🛑 Suggestion fetch failed:", err);
  }
}


  // 🕘 Save and render search history
  function saveHistory(t) {
    let h = JSON.parse(localStorage.searchHistory || "[]").filter(x => x !== t);
    h.unshift(t); if (h.length > 10) h.pop();
    localStorage.searchHistory = JSON.stringify(h);
    renderHistory(); 
    clearHist.onclick = () => {
      localStorage.removeItem("searchHistory");
      renderHistory();
    };
    
  }

  function renderHistory() {
    const h = JSON.parse(localStorage.searchHistory || "[]");
    historyUL.innerHTML = h.map(t => `<li>${t}</li>`).join("");
    [...historyUL.children].forEach(li => li.onclick = () => {
      searchBox.value = li.textContent;
      triggerSearch(li.textContent);
    });
  }
  renderHistory();

  // ✍️ Autocomplete with better UI behavior
searchBox.addEventListener("input", () => {
  const query = searchBox.value.trim();
  if (!query) {
    suggUL.innerHTML = "";
    suggUL.style.display = "none";  // hide when empty
    idx = -1;
    return;
  }

  // 👇 this line makes suggestions reappear
  suggUL.style.display = "block";

  fetch(`https://en.wikipedia.org/w/api.php?origin=*&action=opensearch&format=json&search=${encodeURIComponent(query)}`)
    .then(r => r.json())
    .then(data => {
      const suggestions = data[1].slice(0, 7);
      suggUL.innerHTML = suggestions.map(item => `<li>${item}</li>`).join("");
      idx = -1;

      [...suggUL.children].forEach((li, i) => {
        li.onclick = () => {
          searchBox.value = li.textContent;
          suggUL.innerHTML = "";
          suggUL.style.display = "none"; // still hide after selecting
          triggerSearch(li.textContent);
        };
      });
    });
});

// 🔻 Hide suggestions when scrolling
window.addEventListener("scroll", () => {
  suggUL.style.display = "none";
});

// 🔻 Hide suggestions when clicking search or pressing Enter
searchBtn.onclick = () => {
  suggUL.style.display = "none";
  triggerSearch(searchBox.value.trim());
};

searchBox.addEventListener("keypress", e => {
  if (e.key === "Enter") {
    suggUL.style.display = "none";
    triggerSearch(searchBox.value.trim());
  }
});

  // ⌨️ Arrow nav in suggestions
  let idx = -1;
  searchBox.addEventListener("keydown", e => {
    const items = suggUL.children;
    if (!items.length) return;
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      idx = e.key === "ArrowDown" ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
      [...items].forEach((li, i) => li.classList.toggle("active", i === idx));
    } else if (e.key === "Enter" && idx > -1) {
      e.preventDefault(); items[idx].click();
    }
  });

  // ⬆️ Scroll to top
  back2Top.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
  window.addEventListener("scroll", () => back2Top.style.display = scrollY > 200 ? "block" : "none");
});
