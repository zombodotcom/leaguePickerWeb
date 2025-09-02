let lockfileData = null;

function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('status');
  statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
}

function clearData() {
  lockfileData = null;
  document.getElementById('arenaChallengeOut').innerHTML = `
    <div class="status info">
      <strong>Data cleared!</strong><br>
      Click "Upload Lockfile" to select your lockfile again.
    </div>
  `;
  showStatus('Data cleared', 'info');
}

function toggleLockfileForm() {
  const form = document.getElementById('lockfileForm');
  const btn = document.getElementById('lockfileBtn');
  
  if (form.style.display === 'none') {
    form.style.display = 'block';
    btn.textContent = 'Hide Upload';
  } else {
    form.style.display = 'none';
    btn.textContent = 'Upload Lockfile';
  }
}

function handleFileUpload() {
  const fileInput = document.getElementById('lockfileUpload');
  const file = fileInput.files[0];
  
  if (!file) {
    showStatus('Please select a lockfile to upload', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result.trim();
    parseAndSaveLockfile(content);
  };
  reader.onerror = function() {
    showStatus('Error reading file', 'error');
  };
  reader.readAsText(file);
}

function parseAndSaveLockfile(content) {
  const parts = content.split(':');
  if (parts.length >= 4) {
    lockfileData = {
      name: parts[0],
      pid: parts[1],
      port: parseInt(parts[2]),
      password: parts[3],
      protocol: parts[4] || 'https'
    };
    
    // Clear form
    document.getElementById('lockfileUpload').value = '';
    toggleLockfileForm();
    
    showStatus('Lockfile uploaded successfully!', 'success');
  } else {
    showStatus('Invalid lockfile format. Expected: name:pid:port:password:protocol', 'error');
  }
}

function buildBasicAuthHeader(username, password) {
  const credentials = btoa(`${username}:${password}`);
  return `Basic ${credentials}`;
}

async function lcuRequest({ method = 'GET', path = '/', port, password, isBinary = false }) {
  const url = `https://127.0.0.1:${port}${path}`;
  
  const options = {
    method,
    headers: {
      'Accept': isBinary ? '*/*' : 'application/json',
      'Content-Type': 'application/json',
      'Authorization': buildBasicAuthHeader('riot', password)
    }
  };

  try {
    const response = await fetch(url, options);
    
    if (isBinary) {
      const buffer = await response.arrayBuffer();
      return { statusCode: response.status, body: new Uint8Array(buffer) };
    } else {
      const text = await response.text();
      let body = null;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
      return { statusCode: response.status, body };
    }
  } catch (error) {
    throw new Error(`LCU request failed: ${error.message}`);
  }
}

async function loadArenaChallenge() {
  const out = document.getElementById('arenaChallengeOut');
  const loadBtn = document.getElementById('loadBtn');
  
  if (!lockfileData) {
    showStatus('Please upload your lockfile first', 'error');
    return;
  }
  
  loadBtn.disabled = true;
  loadBtn.textContent = 'Loading...';
  
  out.innerHTML = '<div class="loading">Loading Arena Champion challenge...</div>';
  
  try {
    showStatus('Fetching challenge data...', 'info');

    const [challengeData, championsData] = await Promise.all([
      lcuRequest({
        path: '/lol-challenges/v1/challenges/local-player',
        port: lockfileData.port,
        password: lockfileData.password
      }),
      lcuRequest({
        path: '/lol-champions/v1/owned-champions-minimal',
        port: lockfileData.port,
        password: lockfileData.password
      })
    ]);

    if (challengeData.statusCode !== 200 || !challengeData.body) {
      throw new Error('Failed to fetch challenge data');
    }

    if (championsData.statusCode !== 200 || !championsData.body) {
      throw new Error('Failed to fetch champions data');
    }

    const challenge = challengeData.body['602002'];
    if (!challenge) {
      throw new Error('Arena Champion challenge (602002) not found');
    }

    // Create champion ID to name mapping
    const championMap = {};
    if (championsData.body && typeof championsData.body === 'object') {
      Object.entries(championsData.body).forEach(([championId, championData]) => {
        if (championData && championData.name) {
          const id = championData.id || parseInt(championId);
          championMap[id] = championData.name;
        }
      });
    }

    const progressPercent = Math.round((challenge.currentValue / challenge.currentThreshold) * 100);

    out.innerHTML = `
      <div class="arena-challenge">
        <h3>🏆 ${challenge.capstoneGroupName}</h3>
        <p class="description">${challenge.description}</p>
        
        <div class="progress-section">
          <div class="level-badge ${challenge.currentLevel.toLowerCase()}">${challenge.currentLevel}</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <div class="progress-text">${challenge.currentValue} / ${challenge.currentThreshold}</div>
        </div>
        
        <div class="champions-completed">
          <h4>Champions Completed (${challenge.completedIds.length}):</h4>
          <div class="champion-grid">
            ${challenge.completedIds.map(id => {
              const name = championMap[id] || `ID: ${id}`;
              let championData = null;
              if (championsData.body && championsData.body[id]) {
                championData = championsData.body[id];
              } else if (championsData.body) {
                championData = Object.values(championsData.body).find(champ => champ && champ.id === id);
              }
              
              const imageUrl = championData && championData.squarePortraitPath 
                ? `https://127.0.0.1:${lockfileData.port}${championData.squarePortraitPath}`
                : null;
              
              return `
                <div class="champion-card" title="${name} (ID: ${id})">
                  ${imageUrl ? 
                    `<img src="${imageUrl}" alt="${name}" class="champion-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` :
                    `<div class="champion-fallback">${name}</div>`
                  }
                  <div class="champion-fallback" style="display: none;">${name}</div>
                  <div class="champion-name">${name}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <details class="raw-data">
          <summary>Raw Data</summary>
          <pre>${JSON.stringify(challenge, null, 2)}</pre>
        </details>
      </div>
    `;

    showStatus('Arena challenge loaded successfully!', 'success');

  } catch (err) {
    out.innerHTML = `<div class="error">Failed to load: ${err.message}</div>`;
    showStatus(`Error: ${err.message}`, 'error');
  } finally {
    loadBtn.disabled = false;
    loadBtn.textContent = 'Load Challenge';
  }
}

// Show initial status
showStatus('Ready to load Arena Champion challenge. Upload your lockfile first.', 'info');
