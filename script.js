document.addEventListener("DOMContentLoaded", () => {
  const q = id => document.getElementById(id);
  const searchBox = q("searchBox"), searchBtn = q("searchBtn"), voiceBtn = q("voiceBtn");
  const clearBtn = document.getElementById("clearBtn");

// Show/hide ✖ when typing
searchBox.addEventListener("input", () => {
  clearBtn.style.display = searchBox.value ? "block" : "none";
});

// Clear input when clicked
clearBtn.addEventListener("click", () => {
  searchBox.value = "";
  clearBtn.style.display = "none";
  suggUL.innerHTML = ""; // optional: hide suggestions
  searchBox.focus(); // focus back to input
});

  const suggUL = q("suggestions"), results = q("results"), loading = q("loading");
  const historyUL = q("history"), clearHist = q("clearHistory"), themeTgl = q("themeToggle"), back2Top = q("backToTop");
  
  
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
searchBox.addEventListener("keypress", e => {
  if (e.key === "Enter") triggerSearch(searchBox.value.trim());
});

  async function triggerSearch(term) {
  if (!term) return;
  suggUL.innerHTML = "";
  saveHistory(term);
  results.innerHTML = "";
  loading.classList.add("show");

  const questionWords = ["is", "what", "how", "why", "would", "define", "if", "are", "can", "could", "should", 
    "when", "who", "?", "write", "review", "summary", "give", "will", "where", "was"];
  const firstWord = term.split(" ")[0].toLowerCase();

  // 🤖 Smart AI Q&A
  if (questionWords.includes(firstWord)) {
    const aiAnswer = await fetchAIAnswer(term);
    if (aiAnswer) {
      const formattedAnswer = formatAIAnswer(aiAnswer);

      results.innerHTML = `
        <div class="card ai-answer-card">
          <div class="ai-card-header">
            <h3>✦︎ VoidAI</h3>
            <span class="copy-btn" title="Copy Answer">🗒</span>
          </div>
          <div id="ai-answer-text">${formattedAnswer}</div>
        </div>
      `;

      document.querySelector(".copy-btn").onclick = () => {
        const text = document.getElementById("ai-answer-text").innerText;
        navigator.clipboard.writeText(text).then(() => {
          alert("AI answer copied to clipboard!");
        });
      };
      loading.classList.remove("show");
      return; // ✅ Skip wiki, cricket, book, etc.
    }
  } //

  // 📚 Normal search flow
  await fetchAll(term);
  
  const lowerTerm = term.toLowerCase();
  const bookKeywords = ["book", "novel", "by", "author", "volume", "literature"];
  const isBookSearch = bookKeywords.some(k => lowerTerm.includes(k));
  if (isBookSearch) detectAndFetchBook(term);

  loading.classList.remove("show");
}

function formatAIAnswer(text) {
  const escaped = text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const withLineBreaks = escaped.replace(/\n/g, "<br>");
  const withBold = withLineBreaks.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  const withItalics = withBold.replace(/\*(.*?)\*/g, "<em>$1</em>");
  return withItalics;
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
    const cleanTerm = term.replace(/\?/g, "").trim();
    const wikiURL = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTerm)}`;

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
    setTimeout(() => {
    const readMoreLink = document.getElementById("readMoreLink");
    const collapseLink = document.getElementById("collapseLink");
    const expandedContent = document.getElementById("expandedContent");
    const summaryText = document.querySelector(".wiki-summary");

  if (readMoreLink && collapseLink && expandedContent) {
    readMoreLink.addEventListener("click", async (e) => {
      e.preventDefault();
      readMoreLink.textContent = "Loading more...";

      try {
        const res = await fetch(`https://en.wikipedia.org/w/api.php?origin=*&action=query&prop=extracts&format=json&explaintext=true&titles=${encodeURIComponent(term)}`);
        const data = await res.json();
        const page = Object.values(data.query.pages)[0];
        const fullExtract = page.extract;

        const paragraphs = fullExtract.split("\n").filter(p => p.trim() !== "");
        const shortExtract = paragraphs.slice(0, 4).join("<br><br>"); // Show first 4 paragraphs

        expandedContent.innerHTML = `<p>${shortExtract}</p>`;
        expandedContent.style.display = "block";
        collapseLink.style.display = "inline-block";
        readMoreLink.remove();
      } catch (err) {
        expandedContent.innerHTML = `<p>Could not fetch additional information.</p>`;
        expandedContent.style.display = "block";
        collapseLink.style.display = "none";
        readMoreLink.remove();
      }
    });

    collapseLink.addEventListener("click", () => {
      expandedContent.style.display = "none";
      collapseLink.style.display = "none";
    });
  }
}, 300);





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
    const [ytHTML] = await Promise.all([
      fetchYouTube(term),
    ]);

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
      <h2>${d.title || term}
        <button class="speak-btn" data-title="${encodeURIComponent(d.title)}" title="Read aloud">🔊</button>
      </h2>
      <p class="wiki-summary">${d.extract || "No summary available."}</p>
      ${img}
      <div class="wiki-expand-control">
        <button class="read-more-btn" data-title="${encodeURIComponent(d.title)}">Read more</button>
        <button class="collapse-btn" style="display:none;">Collapse</button>
      </div>
      <div class="expanded-content" style="display:none; margin-top: 1rem;"></div>
      <br><a href="${d.content_urls.desktop.page}" target="_blank">Read on Wikipedia</a>
    </div>
  `;
}
  async function detectAndFetchBook(term) {
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}`);
    const data = await res.json();

    if (data.totalItems > 0 && data.items) {
      const book = data.items.find(b => b.volumeInfo?.description || b.searchInfo?.textSnippet) || data.items[0];
      const info = book.volumeInfo;
      const snippet = book.searchInfo?.textSnippet;

      const title = info.title || term;
      const authors = info.authors ? info.authors.join(", ") : "Unknown author";
      const description = info.description || snippet || "No description available.";
      const thumbnail = info.imageLinks?.thumbnail || "";
      const previewLink = info.previewLink || "#";

      const bookCard = `
        <div class="card">
          <h2>📚 ${title}</h2>
          <p><strong>Author(s):</strong> ${authors}</p>
          <p>${description}</p>
          ${thumbnail ? `<img src="${thumbnail}" alt="Book Cover">` : ""}
          <br><a href="${previewLink}" target="_blank">🔗 Preview Book</a>
        </div>
      `;

      results.innerHTML += bookCard;
    }
  } catch (err) {
    console.error("Book API failed", err);
  }
}
//here brahhhhhhhh sattaksh


  // script.js

async function fetchAIAnswer(question) {
    try {
        const response = await fetch("http://localhost:3000/api/ask-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question }) // Only send the question
        });
        const data = await response.json();
        if (data?.choices?.[0]?.message?.content) {
            return data.choices[0].message.content.trim();
        }
    } catch (err) {
        console.error("Error fetching AI answer from server:", err.message);
    }
    return "❌ Sorry, the AI could not answer your question right now.";
}










  // 🎥 Fetch YouTube Results
 // script.js

async function fetchYouTube(term) {
    try {
        // 👇 This now calls YOUR server, not YouTube directly
        const url = `http://localhost:3000/api/youtube?q=${encodeURIComponent(term)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!data.items) throw "No YouTube results";

        return `
        <div class="card">
            <h3>🎥 Related Videos</h3>
            <ul>
                ${data.items.map(v => `
                    <li>
                        <a href="http://googleusercontent.com/youtube.com/6{v.id.videoId}" target="_blank">
                            ${v.snippet.title}
                        </a>
                    </li>`).join("")}
            </ul>
        </div>`;
    } catch {
        return "";
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
  // 🕘 Save search history
function saveHistory(t) {
  let h = JSON.parse(localStorage.searchHistory || "[]").filter(x => x !== t);
  h.unshift(t);
  if (h.length > 10) h.pop();
  localStorage.searchHistory = JSON.stringify(h);
  renderHistory(); 
}

// 🧾 Render history
function renderHistory() {
  const h = JSON.parse(localStorage.searchHistory || "[]");
  historyUL.innerHTML = h.map(t => `<li>${t}</li>`).join("");
  [...historyUL.children].forEach(li => li.onclick = () => {
    searchBox.value = li.textContent;
    triggerSearch(li.textContent);
  });
}

// ✅ Bind the Clear History button once at the top level
clearHist.onclick = () => {
  localStorage.removeItem("searchHistory");
  renderHistory();
};

// 🔁 Render on page load
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

// 🧠 Toggle "Read more" summary
document.addEventListener("click", async (e) => {
  const card = e.target.closest(".card");
  const expandedDiv = card?.querySelector(".expanded-content");
  const readMoreBtn = card?.querySelector(".read-more-btn");
  const collapseBtn = card?.querySelector(".collapse-btn");

  if (e.target.classList.contains("read-more-btn")) {
    const title = e.target.dataset.title;

    try {
      readMoreBtn.textContent = "Read more";
      const res = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${title}&format=json&origin=*`);
      const data = await res.json();

      const htmlContent = data.parse?.text["*"];
      const doc = new DOMParser().parseFromString(htmlContent, "text/html");
      const paragraphs = [...doc.querySelectorAll("p")].slice(0,6); // 4 paras

      expandedDiv.innerHTML = paragraphs.map(p => `<p>${p.textContent}</p>`).join("");
      expandedDiv.style.display = "block";
      readMoreBtn.style.display = "none";
      collapseBtn.style.display = "inline-block";
    } catch (err) {
      console.error("Wiki fetch failed", err);
      readMoreBtn.textContent = "Read more";
      expandedDiv.innerHTML = `<p>Failed to fetch extended content. Try visiting the Wikipedia link instead.</p>`;
      expandedDiv.style.display = "block";
    }
  }

  if (e.target.classList.contains("collapse-btn")) {
    expandedDiv.innerHTML = "";
    expandedDiv.style.display = "none";
    collapseBtn.style.display = "none";
    readMoreBtn.style.display = "inline-block";
  }
});


// 🔁 On page load, render history if available
document.addEventListener("DOMContentLoaded", () => {
  renderHistory();
});

// 🔊 Handle 'Read the article' speak button
// 🔊 Speak full Wikipedia extract when clicking "Read the article" button
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("speak-btn")) {
    e.stopPropagation(); // Prevent global click from cancelling immediately

    const title = e.target.dataset.title;
    if (!title) return;

    try {
      const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&explaintext=true&titles=${title}&origin=*`);
      const data = await res.json();
      const page = Object.values(data.query.pages)[0];
      const fullText = page.extract;

      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(fullText);
        utterance.lang = "en-US";
        speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error("Speech fetch failed:", err);
    }
  } else {
    // Stop speech if clicked anywhere else
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }
});

