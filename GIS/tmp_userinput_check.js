
    const geojsonURL = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/UMW/MWS_Boundary_Updated_UMC_Names.geojson';
    const geojsonFallbackURLs = [
      geojsonURL,
      'https://cdn.jsdelivr.net/gh/MWS003-GIS/MWS003-GIS.github.io@main/IWWRMP/Data/EXD/UMW/MWS_Boundary_Updated_UMC_Names.geojson'
    ];
    const GITHUB_OWNER = 'MWS003-GIS';
    const GITHUB_REPO = 'MWS003-GIS.github.io';
    const GEOJSON_BASE = 'IWWRMP/Data/EXD/100_PRP';
    const PHOTO_BASE = 'IWWRMP/Data/EXD/200_photo';
    const FALLBACK_DISTRICTS = ['Badulla', 'Kandy', 'Nuwara Eliya'];
    const selectDist = document.getElementById('selectDist');
    const selectDSD = document.getElementById('selectDSD');
    const selectMWSID = document.getElementById('selectMWSID');
    const proposalBtn = document.getElementById('proposalBtn');
    const githubTokenInput = document.getElementById('githubToken');
    const userNameInput = document.getElementById('userName');
    const userPasswordInput = document.getElementById('userPassword');
    const verifyTokenBtn = document.getElementById('verifyTokenBtn');
    const authStatus = document.getElementById('authStatus');
    const helpBtn = document.getElementById('helpBtn');
    const closeHelpBtn = document.getElementById('closeHelpBtn');
    const helpModal = document.getElementById('helpModal');
    const helpVideo = document.getElementById('helpVideo');
    const SUPABASE_URL = 'https://clkaxpcfxtkolomfrvyx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsa2F4cGNmeHRrb2xvbWZydnl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMTU4MzMsImV4cCI6MjA4OTg5MTgzM30.3SyRYu784Q8gwIODOLjTDZqaFMz36TEMpazgRz85NTs';
    const DSD_ACCESS_TABLE = 'user_dsd_access';
    const supabaseClient = (
      window.supabase &&
      !SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
      SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY'
    ) ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
    let isAccessGranted = false;
    let originalData = null;

    function setProposalEnabled() {
      const ready = Boolean(selectDist.value && selectDSD.value && selectMWSID.value && isAccessGranted);
      proposalBtn.disabled = !ready;
    }

    function resetAccess(message) {
      isAccessGranted = false;
      authStatus.textContent = message || 'Verify login to continue.';
      setProposalEnabled();
    }

    function ensureSupabaseReady() {
      if (supabaseClient) return true;
      authStatus.textContent = 'Supabase config missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in UserInput.html.';
      return false;
    }

    async function hasDsdAccess(userId, district, dsd) {
      const { data, error } = await supabaseClient
        .from(DSD_ACCESS_TABLE)
        .select('user_id')
        .eq('user_id', userId)
        .eq('district', district)
        .eq('dsd', dsd)
        .eq('can_edit', true)
        .limit(1);
      if (error) throw new Error(error.message);
      return Array.isArray(data) && data.length > 0;
    }

    async function verifyLoginForSelectedDsd() {
      const district = selectDist.value;
      const dsd = selectDSD.value;
      const username = userNameInput.value.trim();
      const password = userPasswordInput.value;

      if (!ensureSupabaseReady()) return;
      if (!district || !dsd) {
        authStatus.textContent = 'Select District and DSD first.';
        return;
      }
      if (!username || !password) {
        authStatus.textContent = 'Email and password are required.';
        return;
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: username,
        password
      });
      if (error) {
        authStatus.textContent = `Sign-in failed: ${error.message}`;
        return;
      }
      if (!data.user || !data.session) {
        authStatus.textContent = 'Sign-in failed: session not returned.';
        return;
      }

      try {
        const allowed = await hasDsdAccess(data.user.id, district, dsd);
        if (!allowed) {
          await supabaseClient.auth.signOut();
          authStatus.textContent = `No edit permission for ${district} / ${dsd}.`;
          return;
        }
      } catch (errorCheck) {
        authStatus.textContent = `DSD access check failed: ${errorCheck.message}`;
        return;
      }

      authStatus.textContent = `Login verified for ${district} / ${dsd}.`;
      isAccessGranted = true;
      setProposalEnabled();
    }

    function requireAccessAndGithubToken(statusEl) {
      if (!isAccessGranted) {
        statusEl.textContent = 'Error: Verify login first.';
        return '';
      }

      const token = githubTokenInput.value.trim();
      if (!token) {
        statusEl.textContent = 'Error: GitHub token required.';
        return '';
      }

      return token;
    }

    function resetSelect(selectEl, placeholder) {
      selectEl.innerHTML = '';
      const option = document.createElement('option');
      option.value = '';
      option.textContent = placeholder;
      selectEl.appendChild(option);
      selectEl.value = '';
    }

    function populateDistricts(data) {
      resetSelect(selectDist, '--Select District--');
      const districts = new Set();
      const features = Array.isArray(data && data.features) ? data.features : [];
      features.forEach((feature) => {
        if (feature.properties && feature.properties.District) {
          districts.add(feature.properties.District);
        }
      });
      districts.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        selectDist.appendChild(option);
      });
    }

    function populateFallbackDistricts() {
      resetSelect(selectDist, '--Select District--');
      FALLBACK_DISTRICTS.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        selectDist.appendChild(option);
      });
    }

    function populateDSD(data, district) {
      resetSelect(selectDSD, '--Select DSD--');
      resetSelect(selectMWSID, '--Select MWS_ID--');
      selectDSD.disabled = true;
      selectMWSID.disabled = true;

      if (!district) {
        setProposalEnabled();
        return;
      }

      const dsdValues = new Set();
      data.features.forEach((feature) => {
        if (feature.properties && feature.properties.District === district) {
          if (feature.properties.MainDSD) {
            dsdValues.add(feature.properties.MainDSD);
          }
        }
      });

      dsdValues.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        selectDSD.appendChild(option);
      });

      selectDSD.disabled = false;
      setProposalEnabled();
    }

    function populateMWSID(data, dsd) {
      resetSelect(selectMWSID, '--Select MWS_ID--');
      selectMWSID.disabled = true;

      if (!dsd) {
        setProposalEnabled();
        return;
      }

      const mwsValues = new Set();
      data.features.forEach((feature) => {
        if (feature.properties && feature.properties.MainDSD === dsd) {
          if (feature.properties.MWS_ID) {
            mwsValues.add(feature.properties.MWS_ID);
          }
        }
      });

      mwsValues.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        selectMWSID.appendChild(option);
      });

      selectMWSID.disabled = false;
      setProposalEnabled();
    }

    async function initDropdowns() {
      let lastError = null;

      for (const url of geojsonFallbackURLs) {
        try {
          const response = await fetch(url, { cache: 'no-store' });
          if (!response.ok) throw new Error(`Failed to fetch GeoJSON (${response.status})`);
          originalData = await response.json();
          populateDistricts(originalData);
          authStatus.textContent = '';
          return;
        } catch (error) {
          lastError = error;
          console.error('Error loading GeoJSON for dropdowns from', url, error);
        }
      }

      populateFallbackDistricts();
      authStatus.textContent = `District list loaded from fallback only. Full DSD/MWS loading failed: ${lastError ? lastError.message : 'Unknown error'}`;
    }

    selectDist.addEventListener('change', () => {
      if (!originalData) return;
      populateDSD(originalData, selectDist.value);
      resetAccess('District changed. Re-verify login for current DSD.');
    });

    selectDSD.addEventListener('change', () => {
      if (!originalData) return;
      populateMWSID(originalData, selectDSD.value);
      resetAccess('DSD changed. Re-verify login for selected DSD.');
    });

    selectMWSID.addEventListener('change', setProposalEnabled);
    verifyTokenBtn.addEventListener('click', verifyLoginForSelectedDsd);
    helpBtn.addEventListener('click', () => {
      helpModal.classList.add('open');
      helpModal.setAttribute('aria-hidden', 'false');
    });
    closeHelpBtn.addEventListener('click', () => {
      helpModal.classList.remove('open');
      helpModal.setAttribute('aria-hidden', 'true');
      helpVideo.pause();
      helpVideo.currentTime = 0;
    });
    helpModal.addEventListener('click', (event) => {
      if (event.target === helpModal) {
        helpModal.classList.remove('open');
        helpModal.setAttribute('aria-hidden', 'true');
        helpVideo.pause();
        helpVideo.currentTime = 0;
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && helpModal.classList.contains('open')) {
        helpModal.classList.remove('open');
        helpModal.setAttribute('aria-hidden', 'true');
        helpVideo.pause();
        helpVideo.currentTime = 0;
      }
    });

    const proposalList = document.getElementById('proposalList');
    const proposalTypes = ['DWS', 'Landslides', 'MI', 'MT', 'SR', 'SWC_ON', 'SWC_OFF', 'WP', 'WSP'];

    function renderProposalList() {
      proposalList.innerHTML = '';
      proposalTypes.forEach((type) => {
        const item = document.createElement('span');
        item.className = 'proposal-item';
        item.textContent = type;
        item.dataset.type = type;
        proposalList.appendChild(item);
      });
      proposalList.style.display = 'block';
    }

    proposalBtn.addEventListener('click', () => {
      if (proposalBtn.disabled) return;
      renderProposalList();
    });

    const formPanel = document.getElementById('formPanel');

    function setActiveProposal(type) {
      document.querySelectorAll('.proposal-item').forEach((el) => {
        if (el.dataset.type === type) el.classList.add('active');
        else el.classList.remove('active');
      });
    }

    function toBase64Utf8(text) {
      const bytes = new TextEncoder().encode(text);
      let binary = '';
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      return btoa(binary);
    }

    function normalizeMwsFolder(mwsId) {
      let cleaned = String(mwsId || '').trim();
      if (!cleaned) return '';
      cleaned = cleaned.replace(/-/g, '_').replace(/[^A-Za-z0-9_]/g, '');
      if (!cleaned.toUpperCase().startsWith('MWS_')) cleaned = `MWS_${cleaned}`;
      return cleaned;
    }

    function formatGeojsonOneFeaturePerLine(geojson) {
      const head = [
        '{',
        `  "type": ${JSON.stringify(geojson.type || 'FeatureCollection')},`,
        `  "name": ${JSON.stringify(geojson.name || '')},`
      ];
      if (geojson.crs) {
        head.push(`  "crs": ${JSON.stringify(geojson.crs)},`);
      }
      head.push('  "features": [');
      const features = Array.isArray(geojson.features) ? geojson.features : [];
      const featureLines = features.map((f) => `    ${JSON.stringify(f)}`);
      const tail = [
        featureLines.join(',\n'),
        '  ]',
        '}'
      ];
      return head.concat(tail).join('\n');
    }

    async function getFileSha(path, token) {
      const resp = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
        headers: { 'Authorization': `token ${token}` }
      });
      if (!resp.ok) throw new Error(`Failed to get SHA (${resp.status})`);
      const data = await resp.json();
      return data.sha;
    }

    async function uploadPhotoToGitHub(token, mwsId, file) {
      const folder = normalizeMwsFolder(mwsId);
      if (!folder) throw new Error('Missing MWS_ID');
      const filePath = `${PHOTO_BASE}/${folder}/${file.name}`;
      const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
      const contentBuffer = await file.arrayBuffer();
      const base64Content = btoa(String.fromCharCode(...new Uint8Array(contentBuffer)));

      let sha;
      try {
        sha = await getFileSha(filePath, token);
      } catch (error) {
        sha = null;
      }

      const resp = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Upload photo ${file.name}`,
          content: base64Content,
          sha: sha || undefined
        })
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Photo upload failed (${resp.status}): ${text}`);
      }

      return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${filePath}`;
    }

    async function updateGeojsonOnGitHub(payload, token) {
      const folder = normalizeMwsFolder(payload.mws_id);
      if (!folder) throw new Error('Missing MWS_ID');
      const path = `${folder}/${payload.proposal_type}.geojson`;
      const contentsApi = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

      let geojson = null;
      let sha = null;
      const getResp = await fetch(contentsApi, {
        headers: { 'Authorization': `token ${token}` }
      });
      if (getResp.ok) {
        const fileData = await getResp.json();
        sha = fileData.sha || null;
        const decoded = atob((fileData.content || '').replace(/\n/g, ''));
        geojson = JSON.parse(decoded);
      } else if (getResp.status === 404) {
        geojson = {
          type: 'FeatureCollection',
          name: payload.proposal_type,
          features: []
        };
      } else {
        const text = await getResp.text();
        throw new Error(`Failed to read GeoJSON (${getResp.status}): ${text}`);
      }
      if (!Array.isArray(geojson.features)) {
        geojson.features = [];
      }

      let properties;
        if (payload.proposal_type === 'DWS') {
          properties = {
            'No': payload.no || '',
            'GND No.': payload.gnd_no || '',
            'Scheme': payload.scheme || '',
            'N': payload.n,
            'E': payload.e,
            'Observation': payload.observation || payload.problem || '',
            'Description': payload.description || payload.recommendation || '',
            'Amount (Rs.)': payload.amount || payload.estimated_cost || '',
            'photopath': payload.photopath || ''
          };
        } else if (payload.proposal_type === 'Landslides') {
          properties = {
            'No.': payload.no || '',
            'GN Division No.': payload.gn_div_no || '',
            'GN Division': payload.gn_div || '',
            'Land Slides': payload.land_slides || '',
          'N': payload.n,
          'E': payload.e,
          'NBRO Recommendation N/A': payload.nbro_rec || '',
          'Proposed Measures': payload.measures || '',
          'photopath': payload.photopath || ''
        };
        } else if (payload.proposal_type === 'MI') {
          properties = {
            'No': payload.no || '',
            'GND No.': payload.gnd_no || '',
            'Scheme': payload.scheme || '',
            'N': payload.n,
            'E': payload.e,
            'Observation': payload.observation || payload.problem || '',
            'Description': payload.description || '',
            'Amount (Rs.)': payload.amount || payload.estimated_cost || '',
            'photopath': payload.photopath || ''
          };
        } else if (payload.proposal_type === 'MT') {
          properties = {
            'Name_of_Custodian': payload.name_of_custodian || '',
            'N': payload.n,
            'E': payload.e,
            'Remarks': payload.remarks || payload.problem || '',
            'photopath': payload.photopath || ''
          };
        } else if (payload.proposal_type === 'SR') {
          properties = {
            'No': payload.no || '',
            'GND No.': payload.gnd_no || '',
            'Scheme': payload.scheme || '',
            'N': payload.n,
            'E': payload.e,
            'Observation': payload.observation || payload.problem || '',
            'Description': payload.description || '',
            'Amount (Rs.)': payload.amount || payload.estimated_cost || '',
            'photopath': payload.photopath || ''
          };
        } else if (payload.proposal_type === 'SWC_ON') {
          properties = {
            'No.': payload.no || '',
            'GND No.': payload.gnd_no || '',
            'GND Name': payload.gnd_name || '',
            'Key Activities proposed for Soil and Water conservation': payload.key_activities || '',
            'Priority based on Soil Erosion Hazard': payload.priority || '',
            'N': payload.n,
            'E': payload.e,
            'Quantity': payload.quantity || '',
            'Proposed measure/s': payload.measures || '',
            'Unit Cost (Rs.)': payload.unit_cost || '',
            'Total_Cost': payload.total_cost || payload.total_cost_rs || '',
            'Contribution (Local Community, LA, and the project)': payload.contribution || '',
            'Time frame for the implementation': payload.time_frame || '',
            'photopath': payload.photopath || ''
          };
      } else if (payload.proposal_type === 'SWC_OFF') {
        properties = {
          'No.': payload.no || '',
          'GND No.': payload.gnd_no || '',
          'GND Name': payload.gnd_name || '',
          'Key Activities proposed for Soil and Water conservation': payload.key_activities || '',
          'Priority based on Soil Erosion Hazard': payload.priority || '',
          'N': payload.n,
          'E': payload.e,
          'Quantity': payload.quantity || '',
          'Proposed': payload.measures || '',
          'Total_Cost': payload.total_cost || payload.total_cost_rs || '',
          'Contribution (Local Community, LA, and the project)': payload.contribution || '',
          'Time frame for the implementation': payload.time_frame || '',
          'photopath': payload.photopath || ''
        };
      } else if (payload.proposal_type === 'WP') {
        properties = {
          'No.': payload.no || '',
          'GND No.': payload.gnd_no || '',
          'GN Division': payload.gn_div || '',
          'Non-point sources of pollution': payload.non_point || '',
          'N': payload.n,
          'E': payload.e,
          'Point sources of pollution': payload.point_sources || '',
          'Add. N': payload.add_n,
          'Add. E': payload.add_e,
          'Recommended water quality improvement measures': payload.measures || '',
          'Unit Cost (Rs.)': payload.unit_cost || '',
          'Total Cost (Rs.)': payload.total_cost || '',
          'Contributions (Local Community, LA, Project)': payload.contribution || '',
          'Time frame to implement': payload.time_frame || '',
          'photopath': payload.photopath || ''
        };
        } else if (payload.proposal_type === 'WSP') {
          properties = {
            'No': payload.no || '',
            'GND No.': payload.gnd_no || '',
            'Name of the Tank': payload.tank_name || '',
            'N': payload.n,
            'E': payload.e,
            'Observation': payload.observation || payload.problem || '',
            'Description': payload.description || payload.recommendation || '',
            'Amount (Rs.)': payload.amount || payload.estimated_cost || '',
            'photopath': payload.photopath || ''
          };
        } else {
          properties = {
            'No': payload.no || '',
            'GND No.': payload.gnd_no || '',
            Scheme: payload.scheme || '',
            'Observation': payload.observation || payload.problem || '',
            N: payload.n,
            E: payload.e,
            'Description': payload.description || '',
            'Amount (Rs.)': payload.amount || payload.estimated_cost || '',
            photopath: payload.photopath || ''
          };
        }

      const feature = {
        type: 'Feature',
        properties,
        geometry: { type: 'Point', coordinates: [payload.e, payload.n] }
      };
      geojson.features.push(feature);

      const content = toBase64Utf8(formatGeojsonOneFeaturePerLine(geojson));
      const body = {
        message: `Append ${payload.proposal_type} feature`,
        content
      };
      if (sha) body.sha = sha;

      const putResp = await fetch(contentsApi, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!putResp.ok) {
        const text = await putResp.text();
        throw new Error(`GitHub update failed (${putResp.status}): ${text}`);
      }
    }

    function renderDwsForm() {
      formPanel.innerHTML = `
        <h3>DWS (Domestic Water Supply) - New Entry</h3>
        <div class="form-grid">
          <div>
            <label for="dwsNo">No</label>
            <input id="dwsNo" type="text" />
          </div>
          <div>
            <label for="dwsGndNo">GND No.</label>
            <input id="dwsGndNo" type="text" />
          </div>
          <div>
            <label for="dwsScheme">Scheme</label>
            <input id="dwsScheme" type="text" />
          </div>
          <div>
            <label for="dwsN">N</label>
            <input id="dwsN" type="number" step="any" />
          </div>
          <div>
            <label for="dwsE">E</label>
            <input id="dwsE" type="number" step="any" />
          </div>
          <div class="full">
            <label for="dwsObservation">Observation</label>
            <textarea id="dwsObservation" rows="2"></textarea>
          </div>
          <div class="full">
            <label for="dwsDescription">Description</label>
            <textarea id="dwsDescription" rows="2"></textarea>
          </div>
          <div>
            <label for="dwsAmount">Amount (Rs.)</label>
            <input id="dwsAmount" type="text" />
          </div>
          <div>
            <label for="dwsPhoto">photopath</label>
            <input id="dwsPhoto" type="text" />
          </div>
          <div class="full">
            <label for="dwsPhotoFile">Add Photo</label>
            <input id="dwsPhotoFile" type="file" accept="image/*" />
          </div>
        </div>
        <div class="form-actions">
          <button id="dwsSubmit" class="btn">Add to DWS.geojson</button>
          <span id="dwsStatus" class="note"></span>
        </div>
      `;
      formPanel.style.display = 'block';

      function toBase64Utf8(text) {
        const bytes = new TextEncoder().encode(text);
        let binary = '';
        bytes.forEach((b) => { binary += String.fromCharCode(b); });
        return btoa(binary);
      }

      function normalizeMwsFolder(mwsId) {
        let cleaned = String(mwsId || '').trim();
        if (!cleaned) return '';
        cleaned = cleaned.replace(/-/g, '_').replace(/[^A-Za-z0-9_]/g, '');
        if (!cleaned.toUpperCase().startsWith('MWS_')) cleaned = `MWS_${cleaned}`;
        return cleaned;
      }

      function formatGeojsonOneFeaturePerLine(geojson) {
        const head = [
          '{',
          `  "type": ${JSON.stringify(geojson.type || 'FeatureCollection')},`,
          `  "name": ${JSON.stringify(geojson.name || '')},`
        ];
        if (geojson.crs) {
          head.push(`  "crs": ${JSON.stringify(geojson.crs)},`);
        }
        head.push('  "features": [');
        const features = Array.isArray(geojson.features) ? geojson.features : [];
        const featureLines = features.map((f) => `    ${JSON.stringify(f)}`);
        const tail = [
          featureLines.join(',\n'),
          '  ]',
          '}'
        ];
        return head.concat(tail).join('\n');
      }

      async function getFileSha(path, token) {
        const resp = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
          headers: { 'Authorization': `token ${token}` }
        });
        if (!resp.ok) throw new Error(`Failed to get SHA (${resp.status})`);
        const data = await resp.json();
        return data.sha;
      }

      async function uploadPhotoToGitHub(token, mwsId, file) {
        const folder = normalizeMwsFolder(mwsId);
        if (!folder) throw new Error('Missing MWS_ID');
        const filePath = `${PHOTO_BASE}/${folder}/${file.name}`;
        const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
        const contentBuffer = await file.arrayBuffer();
        const base64Content = btoa(String.fromCharCode(...new Uint8Array(contentBuffer)));

        let sha;
        try {
          sha = await getFileSha(filePath, token);
        } catch (error) {
          sha = null;
        }

        const resp = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Upload photo ${file.name}`,
            content: base64Content,
            sha: sha || undefined
          })
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Photo upload failed (${resp.status}): ${text}`);
        }

        return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${filePath}`;
      }

      async function updateGeojsonOnGitHub(payload, token) {
        const folder = normalizeMwsFolder(payload.mws_id);
        if (!folder) throw new Error('Missing MWS_ID');
        const path = `${GEOJSON_BASE}/${folder}/${payload.proposal_type}.geojson`;
        const contentsApi = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

        let geojson = null;
        let sha = null;
        const getResp = await fetch(contentsApi, {
          headers: { 'Authorization': `token ${token}` }
        });
        if (getResp.ok) {
          const fileData = await getResp.json();
          sha = fileData.sha || null;
          const decoded = atob((fileData.content || '').replace(/\n/g, ''));
          geojson = JSON.parse(decoded);
        } else if (getResp.status === 404) {
          // Create a new GeoJSON file when it does not exist
          geojson = {
            type: 'FeatureCollection',
            name: payload.proposal_type,
            features: []
          };
        } else {
          const text = await getResp.text();
          throw new Error(`Failed to read GeoJSON (${getResp.status}): ${text}`);
        }
        if (!Array.isArray(geojson.features)) {
          geojson.features = [];
        }

        let properties;
        if (payload.proposal_type === 'DWS') {
          properties = {
            'No': payload.no || '',
            'GND No.': payload.gnd_no || '',
            'Scheme': payload.scheme || '',
            'N': payload.n,
            'E': payload.e,
            'Observation': payload.observation || payload.problem || '',
            'Description': payload.description || payload.recommendation || '',
            'Amount (Rs.)': payload.amount || payload.estimated_cost || '',
            'photopath': payload.photopath || ''
          };
        } else if (payload.proposal_type === 'Landslides') {
          properties = {
            'No.': payload.no || '',
            'GN Division No.': payload.gn_div_no || '',
            'GN Division': payload.gn_div || '',
            'Land Slides': payload.land_slides || '',
            'N': payload.n,
            'E': payload.e,
            'NBRO Recommendation N/A': payload.nbro_rec || '',
            'Proposed Measures': payload.measures || '',
            'photopath': payload.photopath || ''
          };
        } else if (payload.proposal_type === 'MI') {
          properties = {
            'No': payload.no || '',
            'GND No.': payload.gnd_no || '',
            'Scheme': payload.scheme || '',
            'N': payload.n,
            'E': payload.e,
            'Observation': payload.observation || payload.problem || '',
            'Description': payload.description || '',
            'Amount (Rs.)': payload.amount || payload.estimated_cost || '',
            'photopath': payload.photopath || ''
          };
        } else if (payload.proposal_type === 'MT') {
          properties = {
            'Name_of_Custodian': payload.name_of_custodian || '',
            'N': payload.n,
            'E': payload.e,
            'Remarks': payload.remarks || payload.problem || '',
            'photopath': payload.photopath || ''
          };
        } else if (payload.proposal_type === 'SR') {
          properties = {
            'No': payload.no || '',
            'GND No.': payload.gnd_no || '',
            'Scheme': payload.scheme || '',
            'N': payload.n,
            'E': payload.e,
            'Observation': payload.observation || payload.problem || '',
            'Description': payload.description || '',
            'Amount (Rs.)': payload.amount || payload.estimated_cost || '',
            'photopath': payload.photopath || ''
          };
        } else if (payload.proposal_type === 'SWC_ON') {
          properties = {
            'No.': payload.no || '',
            'GND No.': payload.gnd_no || '',
            'GND Name': payload.gnd_name || '',
            'Key Activities proposed for Soil and Water conservation': payload.key_activities || '',
            'Priority based on Soil Erosion Hazard': payload.priority || '',
            'N': payload.n,
            'E': payload.e,
            'Quantity': payload.quantity || '',
            'Proposed measure/s': payload.measures || '',
            'Unit Cost (Rs.)': payload.unit_cost || '',
            'Total_Cost': payload.total_cost || payload.total_cost_rs || '',
            'Contribution (Local Community, LA, and the project)': payload.contribution || '',
            'Time frame for the implementation': payload.time_frame || '',
            'photopath': payload.photopath || ''
          };
        } else if (payload.proposal_type === 'SWC_OFF') {
          properties = {
            'No.': payload.no || '',
            'GND No.': payload.gnd_no || '',
            'GND Name': payload.gnd_name || '',
            'Key Activities proposed for Soil and Water conservation': payload.key_activities || '',
            'Priority based on Soil Erosion Hazard': payload.priority || '',
            'N': payload.n,
            'E': payload.e,
            'Quantity': payload.quantity || '',
            'Proposed': payload.measures || '',
            'Total_Cost': payload.total_cost || payload.total_cost_rs || '',
            'Contribution (Local Community, LA, and the project)': payload.contribution || '',
            'Time frame for the implementation': payload.time_frame || '',
            'photopath': payload.photopath || ''
          };
        } else if (payload.proposal_type === 'WP') {
          properties = {
            'No.': payload.no || '',
            'GND No.': payload.gnd_no || '',
            'GN Division': payload.gn_div || '',
            'Non-point sources of pollution': payload.non_point || '',
            'N': payload.n,
            'E': payload.e,
            'Point sources of pollution': payload.point_sources || '',
            'Add. N': payload.add_n,
            'Add. E': payload.add_e,
            'Recommended water quality improvement measures': payload.measures || '',
            'Unit Cost (Rs.)': payload.unit_cost || '',
            'Total Cost (Rs.)': payload.total_cost || '',
            'Contributions (Local Community, LA, Project)': payload.contribution || '',
            'Time frame to implement': payload.time_frame || '',
            'photopath': payload.photopath || ''
          };
        } else if (payload.proposal_type === 'WSP') {
          properties = {
            'No': payload.no || '',
            'GND No.': payload.gnd_no || '',
            'Name of the Tank': payload.tank_name || '',
            'N': payload.n,
            'E': payload.e,
            'Observation': payload.observation || payload.problem || '',
            'Description': payload.description || payload.recommendation || '',
            'Amount (Rs.)': payload.amount || payload.estimated_cost || '',
            'photopath': payload.photopath || ''
          };
        } else {
          properties = {
            'No': payload.no || '',
            'GND No.': payload.gnd_no || '',
            Scheme: payload.scheme || '',
            'Observation': payload.observation || payload.problem || '',
            N: payload.n,
            E: payload.e,
            'Description': payload.description || '',
            'Amount (Rs.)': payload.amount || payload.estimated_cost || '',
            photopath: payload.photopath || ''
          };
        }

        const feature = {
          type: 'Feature',
          properties,
          geometry: { type: 'Point', coordinates: [payload.e, payload.n] }
        };
        geojson.features.push(feature);

        const content = toBase64Utf8(formatGeojsonOneFeaturePerLine(geojson));
        const body = {
          message: `Append ${payload.proposal_type} feature`,
          content
        };
        if (sha) body.sha = sha;

        const putResp = await fetch(contentsApi, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        if (!putResp.ok) {
          const text = await putResp.text();
          throw new Error(`GitHub update failed (${putResp.status}): ${text}`);
        }
      }

      document.getElementById('dwsSubmit').addEventListener('click', async () => {
        const status = document.getElementById('dwsStatus');
        const token = requireAccessAndGithubToken(status);
        const photoFile = document.getElementById('dwsPhotoFile').files[0] || null;
        const nVal = parseFloat(document.getElementById('dwsN').value);
        const eVal = parseFloat(document.getElementById('dwsE').value);
        if (Number.isNaN(nVal) || Number.isNaN(eVal)) {
          alert('Please enter valid numeric values for N and E.');
          return;
        }
        if (!token) return;

        status.textContent = 'Saving...';

        const payload = {
          mws_id: selectMWSID.value,
          proposal_type: 'DWS',
          no: document.getElementById('dwsNo').value || '',
          gnd_no: document.getElementById('dwsGndNo').value || '',
          scheme: document.getElementById('dwsScheme').value || '',
          n: nVal,
          e: eVal,
          observation: document.getElementById('dwsObservation').value || '',
          description: document.getElementById('dwsDescription').value || '',
          amount: document.getElementById('dwsAmount').value || '',
          photopath: document.getElementById('dwsPhoto').value || ''
        };

        try {
          if (photoFile) {
            const uploadedPath = await uploadPhotoToGitHub(token, payload.mws_id, photoFile);
            payload.photopath = uploadedPath;
          }
          await updateGeojsonOnGitHub(payload, token);
          status.textContent = 'Saved to GitHub.';
        } catch (error) {
          status.textContent = `Error: ${error.message}`;
        }
      });
    }

    function renderLandslidesForm() {
      formPanel.innerHTML = `
        <h3>Landslides - New Entry</h3>
        <div class="form-grid">
          <div>
            <label for="lsNo">No.</label>
            <input id="lsNo" type="text" />
          </div>
          <div>
            <label for="lsGnNo">GN Division No.</label>
            <input id="lsGnNo" type="text" />
          </div>
          <div>
            <label for="lsGn">GN Division</label>
            <input id="lsGn" type="text" />
          </div>
          <div>
            <label for="lsLandSlides">Land Slides</label>
            <input id="lsLandSlides" type="text" />
          </div>
          <div>
            <label for="lsN">N</label>
            <input id="lsN" type="number" step="any" />
          </div>
          <div>
            <label for="lsE">E</label>
            <input id="lsE" type="number" step="any" />
          </div>
          <div class="full">
            <label for="lsNbro">NBRO Recommendation N/A</label>
            <input id="lsNbro" type="text" />
          </div>
          <div class="full">
            <label for="lsMeasures">Proposed Measures</label>
            <textarea id="lsMeasures" rows="3"></textarea>
          </div>
          <div>
            <label for="lsPhotoPath">photopath</label>
            <input id="lsPhotoPath" type="text" />
          </div>
          <div class="full">
            <label for="lsPhotoFile">Add Photo</label>
            <input id="lsPhotoFile" type="file" accept="image/*" />
          </div>
        </div>
        <div class="form-actions">
          <button id="lsSubmit" class="btn">Add to Landslides.geojson</button>
          <span id="lsStatus" class="note"></span>
        </div>
      `;
      formPanel.style.display = 'block';

      document.getElementById('lsSubmit').addEventListener('click', async () => {
        const status = document.getElementById('lsStatus');
        const token = requireAccessAndGithubToken(status);
        const photoFile = document.getElementById('lsPhotoFile').files[0] || null;
        const nVal = parseFloat(document.getElementById('lsN').value);
        const eVal = parseFloat(document.getElementById('lsE').value);
        if (Number.isNaN(nVal) || Number.isNaN(eVal)) {
          alert('Please enter valid numeric values for N/X and E/Y.');
          return;
        }
        if (!token) return;

        status.textContent = 'Saving...';

        const payload = {
          mws_id: selectMWSID.value,
          proposal_type: 'Landslides',
          no: document.getElementById('lsNo').value || '',
          gn_div_no: document.getElementById('lsGnNo').value || '',
          gn_div: document.getElementById('lsGn').value || '',
          land_slides: document.getElementById('lsLandSlides').value || '',
          n: nVal,
          e: eVal,
          nbro_rec: document.getElementById('lsNbro').value || '',
          measures: document.getElementById('lsMeasures').value || '',
          photopath: document.getElementById('lsPhotoPath').value || ''
        };

        try {
          if (photoFile) {
            const uploadedPath = await uploadPhotoToGitHub(token, payload.mws_id, photoFile);
            payload.photopath = uploadedPath;
          }
          await updateGeojsonOnGitHub(payload, token);
          status.textContent = 'Saved to GitHub.';
        } catch (error) {
          status.textContent = `Error: ${error.message}`;
        }
      });
    }

    function renderMiForm() {
      formPanel.innerHTML = `
        <h3>MI ( Minor Irrigation) - New Entry</h3>
        <div class="form-grid">
          <div>
            <label for="miNo">No</label>
            <input id="miNo" type="text" />
          </div>
          <div>
            <label for="miGndNo">GND No.</label>
            <input id="miGndNo" type="text" />
          </div>
          <div>
            <label for="miScheme">Scheme</label>
            <input id="miScheme" type="text" />
          </div>
          <div>
            <label for="miN">N</label>
            <input id="miN" type="number" step="any" />
          </div>
          <div>
            <label for="miE">E</label>
            <input id="miE" type="number" step="any" />
          </div>
          <div class="full">
            <label for="miObservation">Observation</label>
            <textarea id="miObservation" rows="2"></textarea>
          </div>
          <div class="full">
            <label for="miDescription">Description</label>
            <textarea id="miDescription" rows="2"></textarea>
          </div>
          <div>
            <label for="miAmount">Amount (Rs.)</label>
            <input id="miAmount" type="text" />
          </div>
          <div>
            <label for="miPhotoPath">photopath</label>
            <input id="miPhotoPath" type="text" />
          </div>
          <div class="full">
            <label for="miPhotoFile">Add Photo</label>
            <input id="miPhotoFile" type="file" accept="image/*" />
          </div>
        </div>
        <div class="form-actions">
          <button id="miSubmit" class="btn">Add to MI.geojson</button>
          <span id="miStatus" class="note"></span>
        </div>
      `;
      formPanel.style.display = 'block';

      document.getElementById('miSubmit').addEventListener('click', async () => {
        const status = document.getElementById('miStatus');
        const token = requireAccessAndGithubToken(status);
        const photoFile = document.getElementById('miPhotoFile').files[0] || null;
        const nVal = parseFloat(document.getElementById('miN').value);
        const eVal = parseFloat(document.getElementById('miE').value);
        if (Number.isNaN(nVal) || Number.isNaN(eVal)) {
          alert('Please enter valid numeric values for N and E.');
          return;
        }
        if (!token) return;

        status.textContent = 'Saving...';

        const payload = {
          mws_id: selectMWSID.value,
          proposal_type: 'MI',
          no: document.getElementById('miNo').value || '',
          gnd_no: document.getElementById('miGndNo').value || '',
          scheme: document.getElementById('miScheme').value || '',
          n: nVal,
          e: eVal,
          observation: document.getElementById('miObservation').value || '',
          description: document.getElementById('miDescription').value || '',
          amount: document.getElementById('miAmount').value || '',
          photopath: document.getElementById('miPhotoPath').value || ''
        };

        try {
          if (photoFile) {
            const uploadedPath = await uploadPhotoToGitHub(token, payload.mws_id, photoFile);
            payload.photopath = uploadedPath;
          }
          await updateGeojsonOnGitHub(payload, token);
          status.textContent = 'Saved to GitHub.';
        } catch (error) {
          status.textContent = `Error: ${error.message}`;
        }
      });
    }

    function renderMtForm() {
      formPanel.innerHTML = `
        <h3>MT (Minor Tanks)- New Entry</h3>
        <div class="form-grid">
          <div class="full">
            <label for="mtCustodian">Name_of_Custodian</label>
            <input id="mtCustodian" type="text" />
          </div>
          <div>
            <label for="mtN">N</label>
            <input id="mtN" type="number" step="any" />
          </div>
          <div>
            <label for="mtE">E</label>
            <input id="mtE" type="number" step="any" />
          </div>
          <div class="full">
            <label for="mtRemarks">Remarks</label>
            <textarea id="mtRemarks" rows="3"></textarea>
          </div>
          <div>
            <label for="mtPhotoPath">photopath</label>
            <input id="mtPhotoPath" type="text" />
          </div>
          <div class="full">
            <label for="mtPhotoFile">Add Photo</label>
            <input id="mtPhotoFile" type="file" accept="image/*" />
          </div>
        </div>
        <div class="form-actions">
          <button id="mtSubmit" class="btn">Add to MT.geojson</button>
          <span id="mtStatus" class="note"></span>
        </div>
      `;
      formPanel.style.display = 'block';

      document.getElementById('mtSubmit').addEventListener('click', async () => {
        const status = document.getElementById('mtStatus');
        const token = requireAccessAndGithubToken(status);
        const photoFile = document.getElementById('mtPhotoFile').files[0] || null;
        const nVal = parseFloat(document.getElementById('mtN').value);
        const eVal = parseFloat(document.getElementById('mtE').value);
        if (Number.isNaN(nVal) || Number.isNaN(eVal)) {
          alert('Please enter valid numeric values for N and E.');
          return;
        }
        if (!token) return;

        status.textContent = 'Saving...';

        const payload = {
          mws_id: selectMWSID.value,
          proposal_type: 'MT',
          name_of_custodian: document.getElementById('mtCustodian').value || '',
          n: nVal,
          e: eVal,
          remarks: document.getElementById('mtRemarks').value || '',
          photopath: document.getElementById('mtPhotoPath').value || ''
        };

        try {
          if (photoFile) {
            const uploadedPath = await uploadPhotoToGitHub(token, payload.mws_id, photoFile);
            payload.photopath = uploadedPath;
          }
          await updateGeojsonOnGitHub(payload, token);
          status.textContent = 'Saved to GitHub.';
        } catch (error) {
          status.textContent = `Error: ${error.message}`;
        }
      });
    }

    function renderSrForm() {
      formPanel.innerHTML = `
        <h3>SR (Stream Reservation) - New Entry</h3>
        <div class="form-grid">
          <div>
            <label for="srNo">No</label>
            <input id="srNo" type="text" />
          </div>
          <div>
            <label for="srGndNo">GND No.</label>
            <input id="srGndNo" type="text" />
          </div>
          <div>
            <label for="srScheme">Scheme</label>
            <input id="srScheme" type="text" />
          </div>
          <div>
            <label for="srN">N</label>
            <input id="srN" type="number" step="any" />
          </div>
          <div>
            <label for="srE">E</label>
            <input id="srE" type="number" step="any" />
          </div>
          <div class="full">
            <label for="srObservation">Observation</label>
            <textarea id="srObservation" rows="2"></textarea>
          </div>
          <div class="full">
            <label for="srDescription">Description</label>
            <textarea id="srDescription" rows="2"></textarea>
          </div>
          <div>
            <label for="srAmount">Amount (Rs.)</label>
            <input id="srAmount" type="text" />
          </div>
          <div>
            <label for="srPhotoPath">photopath</label>
            <input id="srPhotoPath" type="text" />
          </div>
          <div class="full">
            <label for="srPhotoFile">Add Photo</label>
            <input id="srPhotoFile" type="file" accept="image/*" />
          </div>
        </div>
        <div class="form-actions">
          <button id="srSubmit" class="btn">Add to SR.geojson</button>
          <span id="srStatus" class="note"></span>
        </div>
      `;
      formPanel.style.display = 'block';

      document.getElementById('srSubmit').addEventListener('click', async () => {
        const status = document.getElementById('srStatus');
        const token = requireAccessAndGithubToken(status);
        const photoFile = document.getElementById('srPhotoFile').files[0] || null;
        const nVal = parseFloat(document.getElementById('srN').value);
        const eVal = parseFloat(document.getElementById('srE').value);
        if (Number.isNaN(nVal) || Number.isNaN(eVal)) {
          alert('Please enter valid numeric values for N and E.');
          return;
        }
        if (!token) return;

        status.textContent = 'Saving...';

        const payload = {
          mws_id: selectMWSID.value,
          proposal_type: 'SR',
          no: document.getElementById('srNo').value || '',
          gnd_no: document.getElementById('srGndNo').value || '',
          scheme: document.getElementById('srScheme').value || '',
          n: nVal,
          e: eVal,
          observation: document.getElementById('srObservation').value || '',
          description: document.getElementById('srDescription').value || '',
          amount: document.getElementById('srAmount').value || '',
          photopath: document.getElementById('srPhotoPath').value || ''
        };

        try {
          if (photoFile) {
            const uploadedPath = await uploadPhotoToGitHub(token, payload.mws_id, photoFile);
            payload.photopath = uploadedPath;
          }
          await updateGeojsonOnGitHub(payload, token);
          status.textContent = 'Saved to GitHub.';
        } catch (error) {
          status.textContent = `Error: ${error.message}`;
        }
      });
    }

    function renderSwcOnForm() {
      formPanel.innerHTML = `
        <h3>SWC_ON (Soil & Water Conservation - On Site) - New Entry</h3>
        <div class="form-grid">
          <div>
            <label for="swcNo">No.</label>
            <input id="swcNo" type="text" />
          </div>
          <div>
            <label for="swcGndNo">GND No.</label>
            <input id="swcGndNo" type="text" />
          </div>
          <div>
            <label for="swcGndName">GND Name</label>
            <input id="swcGndName" type="text" />
          </div>
          <div class="full">
            <label for="swcKeyActivities">Key Activities proposed for Soil and Water conservation</label>
            <textarea id="swcKeyActivities" rows="3"></textarea>
          </div>
          <div class="full">
            <label for="swcPriority">Priority based on Soil Erosion Hazard</label>
            <input id="swcPriority" type="text" />
          </div>
          <div>
            <label for="swcN">N</label>
            <input id="swcN" type="number" step="any" />
          </div>
          <div>
            <label for="swcE">E</label>
            <input id="swcE" type="number" step="any" />
          </div>
          <div>
            <label for="swcQty">Quantity</label>
            <input id="swcQty" type="text" />
          </div>
          <div class="full">
            <label for="swcMeasures">Proposed measure/s</label>
            <textarea id="swcMeasures" rows="2"></textarea>
          </div>
          <div>
            <label for="swcUnitCost">Unit Cost (Rs.)</label>
            <input id="swcUnitCost" type="text" />
          </div>
          <div>
            <label for="swcTotalCost">Total_Cost</label>
            <input id="swcTotalCost" type="text" />
          </div>
          <div class="full">
            <label for="swcContribution">Contribution (Local Community, LA, and the project)</label>
            <textarea id="swcContribution" rows="2"></textarea>
          </div>
          <div class="full">
            <label for="swcTimeFrame">Time frame for the implementation</label>
            <input id="swcTimeFrame" type="text" />
          </div>
          <div>
            <label for="swcPhotoPath">photopath</label>
            <input id="swcPhotoPath" type="text" />
          </div>
          <div class="full">
            <label for="swcPhotoFile">Add Photo</label>
            <input id="swcPhotoFile" type="file" accept="image/*" />
          </div>
        </div>
        <div class="form-actions">
          <button id="swcSubmit" class="btn">Add to SWC_ON.geojson</button>
          <span id="swcStatus" class="note"></span>
        </div>
      `;
      formPanel.style.display = 'block';

      document.getElementById('swcSubmit').addEventListener('click', async () => {
        const status = document.getElementById('swcStatus');
        const token = requireAccessAndGithubToken(status);
        const photoFile = document.getElementById('swcPhotoFile').files[0] || null;
        const nVal = parseFloat(document.getElementById('swcN').value);
        const eVal = parseFloat(document.getElementById('swcE').value);
        if (Number.isNaN(nVal) || Number.isNaN(eVal)) {
          alert('Please enter valid numeric values for N/X and E/Y.');
          return;
        }
        if (!token) return;

        status.textContent = 'Saving...';

        const payload = {
          mws_id: selectMWSID.value,
          proposal_type: 'SWC_ON',
          no: document.getElementById('swcNo').value || '',
          gnd_no: document.getElementById('swcGndNo').value || '',
          gnd_name: document.getElementById('swcGndName').value || '',
          key_activities: document.getElementById('swcKeyActivities').value || '',
          priority: document.getElementById('swcPriority').value || '',
          n: nVal,
          e: eVal,
          quantity: document.getElementById('swcQty').value || '',
          measures: document.getElementById('swcMeasures').value || '',
          unit_cost: document.getElementById('swcUnitCost').value || '',
          total_cost: document.getElementById('swcTotalCost').value || '',
          contribution: document.getElementById('swcContribution').value || '',
          time_frame: document.getElementById('swcTimeFrame').value || '',
          photopath: document.getElementById('swcPhotoPath').value || ''
        };

        try {
          if (photoFile) {
            const uploadedPath = await uploadPhotoToGitHub(token, payload.mws_id, photoFile);
            payload.photopath = uploadedPath;
          }
          await updateGeojsonOnGitHub(payload, token);
          status.textContent = 'Saved to GitHub.';
        } catch (error) {
          status.textContent = `Error: ${error.message}`;
        }
      });
    }

    function renderSwcOffForm() {
      formPanel.innerHTML = `
        <h3>SWC_OFF (Soil & Water Conservation - Off Site) - New Entry</h3>
        <div class="form-grid">
          <div>
            <label for="swcoffNo">No.</label>
            <input id="swcoffNo" type="text" />
          </div>
          <div>
            <label for="swcoffGndNo">GND No.</label>
            <input id="swcoffGndNo" type="text" />
          </div>
          <div>
            <label for="swcoffGndName">GND Name</label>
            <input id="swcoffGndName" type="text" />
          </div>
          <div class="full">
            <label for="swcoffKeyActivities">Key Activities proposed for Soil and Water conservation</label>
            <textarea id="swcoffKeyActivities" rows="3"></textarea>
          </div>
          <div class="full">
            <label for="swcoffPriority">Priority based on Soil Erosion Hazard</label>
            <input id="swcoffPriority" type="text" />
          </div>
          <div>
            <label for="swcoffN">N</label>
            <input id="swcoffN" type="number" step="any" />
          </div>
          <div>
            <label for="swcoffE">E</label>
            <input id="swcoffE" type="number" step="any" />
          </div>
          <div>
            <label for="swcoffQty">Quantity</label>
            <input id="swcoffQty" type="text" />
          </div>
          <div>
            <label for="swcoffMeasures">Proposed</label>
            <input id="swcoffMeasures" type="text" />
          </div>
          <div>
            <label for="swcoffTotalCost">Total_Cost</label>
            <input id="swcoffTotalCost" type="text" />
          </div>
          <div class="full">
            <label for="swcoffContribution">Contribution (Local Community, LA, and the project)</label>
            <textarea id="swcoffContribution" rows="2"></textarea>
          </div>
          <div class="full">
            <label for="swcoffTimeFrame">Time frame for the implementation</label>
            <input id="swcoffTimeFrame" type="text" />
          </div>
          <div>
            <label for="swcoffPhotoPath">photopath</label>
            <input id="swcoffPhotoPath" type="text" />
          </div>
          <div class="full">
            <label for="swcoffPhotoFile">Add Photo</label>
            <input id="swcoffPhotoFile" type="file" accept="image/*" />
          </div>
        </div>
        <div class="form-actions">
          <button id="swcoffSubmit" class="btn">Add to SWC_OFF.geojson</button>
          <span id="swcoffStatus" class="note"></span>
        </div>
      `;
      formPanel.style.display = 'block';

      document.getElementById('swcoffSubmit').addEventListener('click', async () => {
        const status = document.getElementById('swcoffStatus');
        const token = requireAccessAndGithubToken(status);
        const photoFile = document.getElementById('swcoffPhotoFile').files[0] || null;
        const nVal = parseFloat(document.getElementById('swcoffN').value);
        const eVal = parseFloat(document.getElementById('swcoffE').value);
        if (Number.isNaN(nVal) || Number.isNaN(eVal)) {
          alert('Please enter valid numeric values for N and E.');
          return;
        }
        if (!token) return;

        status.textContent = 'Saving...';

        const payload = {
          mws_id: selectMWSID.value,
          proposal_type: 'SWC_OFF',
          no: document.getElementById('swcoffNo').value || '',
          gnd_no: document.getElementById('swcoffGndNo').value || '',
          gnd_name: document.getElementById('swcoffGndName').value || '',
          key_activities: document.getElementById('swcoffKeyActivities').value || '',
          priority: document.getElementById('swcoffPriority').value || '',
          n: nVal,
          e: eVal,
          quantity: document.getElementById('swcoffQty').value || '',
          measures: document.getElementById('swcoffMeasures').value || '',
          total_cost: document.getElementById('swcoffTotalCost').value || '',
          contribution: document.getElementById('swcoffContribution').value || '',
          time_frame: document.getElementById('swcoffTimeFrame').value || '',
          photopath: document.getElementById('swcoffPhotoPath').value || ''
        };

        try {
          if (photoFile) {
            const uploadedPath = await uploadPhotoToGitHub(token, payload.mws_id, photoFile);
            payload.photopath = uploadedPath;
          }
          await updateGeojsonOnGitHub(payload, token);
          status.textContent = 'Saved to GitHub.';
        } catch (error) {
          status.textContent = `Error: ${error.message}`;
        }
      });
    }

    function renderWpForm() {
      formPanel.innerHTML = `
        <h3>WP - New Entry</h3>
        <div class="form-grid">
          <div>
            <label for="wpNo">No.</label>
            <input id="wpNo" type="text" />
          </div>
          <div>
            <label for="wpGndNo">GND No.</label>
            <input id="wpGndNo" type="text" />
          </div>
          <div>
            <label for="wpGnDiv">GN Division</label>
            <input id="wpGnDiv" type="text" />
          </div>
          <div class="full">
            <label for="wpNonPoint">Non-point sources of pollution</label>
            <textarea id="wpNonPoint" rows="2"></textarea>
          </div>
          <div>
            <label for="wpN">N</label>
            <input id="wpN" type="number" step="any" />
          </div>
          <div>
            <label for="wpE">E</label>
            <input id="wpE" type="number" step="any" />
          </div>
          <div class="full">
            <label for="wpPoint">Point sources of pollution</label>
            <textarea id="wpPoint" rows="2"></textarea>
          </div>
          <div>
            <label for="wpAddN">Add. N</label>
            <input id="wpAddN" type="number" step="any" />
          </div>
          <div>
            <label for="wpAddE">Add. E</label>
            <input id="wpAddE" type="number" step="any" />
          </div>
          <div class="full">
            <label for="wpMeasures">Recommended water quality improvement measures</label>
            <textarea id="wpMeasures" rows="3"></textarea>
          </div>
          <div>
            <label for="wpUnitCost">Unit Cost (Rs.)</label>
            <input id="wpUnitCost" type="text" />
          </div>
          <div>
            <label for="wpTotalCost">Total Cost (Rs.)</label>
            <input id="wpTotalCost" type="text" />
          </div>
          <div class="full">
            <label for="wpContribution">Contributions (Local Community, LA, Project)</label>
            <textarea id="wpContribution" rows="2"></textarea>
          </div>
          <div class="full">
            <label for="wpTimeFrame">Time frame to implement</label>
            <input id="wpTimeFrame" type="text" />
          </div>
          <div>
            <label for="wpPhotoPath">photopath</label>
            <input id="wpPhotoPath" type="text" />
          </div>
          <div class="full">
            <label for="wpPhotoFile">Add Photo</label>
            <input id="wpPhotoFile" type="file" accept="image/*" />
          </div>
        </div>
        <div class="form-actions">
          <button id="wpSubmit" class="btn">Add to WP.geojson</button>
          <span id="wpStatus" class="note"></span>
        </div>
      `;
      formPanel.style.display = 'block';

      document.getElementById('wpSubmit').addEventListener('click', async () => {
        const status = document.getElementById('wpStatus');
        const token = requireAccessAndGithubToken(status);
        const photoFile = document.getElementById('wpPhotoFile').files[0] || null;
        const nVal = parseFloat(document.getElementById('wpN').value);
        const eVal = parseFloat(document.getElementById('wpE').value);
        const addNVal = parseFloat(document.getElementById('wpAddN').value);
        const addEVal = parseFloat(document.getElementById('wpAddE').value);
        if (Number.isNaN(nVal) || Number.isNaN(eVal)) {
          alert('Please enter valid numeric values for N/X and E/Y.');
          return;
        }
        if (!token) return;

        status.textContent = 'Saving...';

        const payload = {
          mws_id: selectMWSID.value,
          proposal_type: 'WP',
          no: document.getElementById('wpNo').value || '',
          gnd_no: document.getElementById('wpGndNo').value || '',
          gn_div: document.getElementById('wpGnDiv').value || '',
          non_point: document.getElementById('wpNonPoint').value || '',
          n: nVal,
          e: eVal,
          point_sources: document.getElementById('wpPoint').value || '',
          add_n: Number.isNaN(addNVal) ? '' : addNVal,
          add_e: Number.isNaN(addEVal) ? '' : addEVal,
          measures: document.getElementById('wpMeasures').value || '',
          unit_cost: document.getElementById('wpUnitCost').value || '',
          total_cost: document.getElementById('wpTotalCost').value || '',
          contribution: document.getElementById('wpContribution').value || '',
          time_frame: document.getElementById('wpTimeFrame').value || '',
          photopath: document.getElementById('wpPhotoPath').value || ''
        };

        try {
          if (photoFile) {
            const uploadedPath = await uploadPhotoToGitHub(token, payload.mws_id, photoFile);
            payload.photopath = uploadedPath;
          }
          await updateGeojsonOnGitHub(payload, token);
          status.textContent = 'Saved to GitHub.';
        } catch (error) {
          status.textContent = `Error: ${error.message}`;
        }
      });
    }

    function renderWspForm() {
      formPanel.innerHTML = `
        <h3>WSP - New Entry</h3>
        <div class="form-grid">
          <div>
            <label for="wspNo">No</label>
            <input id="wspNo" type="text" />
          </div>
          <div>
            <label for="wspGndNo">GND No.</label>
            <input id="wspGndNo" type="text" />
          </div>
          <div class="full">
            <label for="wspTank">Name of the Tank</label>
            <input id="wspTank" type="text" />
          </div>
          <div>
            <label for="wspN">N</label>
            <input id="wspN" type="number" step="any" />
          </div>
          <div>
            <label for="wspE">E</label>
            <input id="wspE" type="number" step="any" />
          </div>
          <div class="full">
            <label for="wspObservation">Observation</label>
            <textarea id="wspObservation" rows="2"></textarea>
          </div>
          <div class="full">
            <label for="wspDescription">Description</label>
            <textarea id="wspDescription" rows="2"></textarea>
          </div>
          <div>
            <label for="wspAmount">Amount (Rs.)</label>
            <input id="wspAmount" type="text" />
          </div>
          <div>
            <label for="wspPhotoPath">photopath</label>
            <input id="wspPhotoPath" type="text" />
          </div>
          <div class="full">
            <label for="wspPhotoFile">Add Photo</label>
            <input id="wspPhotoFile" type="file" accept="image/*" />
          </div>
        </div>
        <div class="form-actions">
          <button id="wspSubmit" class="btn">Add to WSP.geojson</button>
          <span id="wspStatus" class="note"></span>
        </div>
      `;
      formPanel.style.display = 'block';

      document.getElementById('wspSubmit').addEventListener('click', async () => {
        const status = document.getElementById('wspStatus');
        const token = requireAccessAndGithubToken(status);
        const photoFile = document.getElementById('wspPhotoFile').files[0] || null;
        const nVal = parseFloat(document.getElementById('wspN').value);
        const eVal = parseFloat(document.getElementById('wspE').value);
        if (Number.isNaN(nVal) || Number.isNaN(eVal)) {
          alert('Please enter valid numeric values for N and E.');
          return;
        }
        if (!token) return;

        status.textContent = 'Saving...';

        const payload = {
          mws_id: selectMWSID.value,
          proposal_type: 'WSP',
          no: document.getElementById('wspNo').value || '',
          gnd_no: document.getElementById('wspGndNo').value || '',
          tank_name: document.getElementById('wspTank').value || '',
          n: nVal,
          e: eVal,
          observation: document.getElementById('wspObservation').value || '',
          description: document.getElementById('wspDescription').value || '',
          amount: document.getElementById('wspAmount').value || '',
          photopath: document.getElementById('wspPhotoPath').value || ''
        };

        try {
          if (photoFile) {
            const uploadedPath = await uploadPhotoToGitHub(token, payload.mws_id, photoFile);
            payload.photopath = uploadedPath;
          }
          await updateGeojsonOnGitHub(payload, token);
          status.textContent = 'Saved to GitHub.';
        } catch (error) {
          status.textContent = `Error: ${error.message}`;
        }
      });
    }

    proposalList.addEventListener('click', (event) => {
      const target = event.target;
      if (!target.classList.contains('proposal-item')) return;
      const type = target.dataset.type;
      setActiveProposal(type);
      if (type === 'DWS') {
        renderDwsForm();
      } else if (type === 'Landslides') {
        renderLandslidesForm();
      } else if (type === 'MI') {
        renderMiForm();
      } else if (type === 'MT') {
        renderMtForm();
      } else if (type === 'SR') {
        renderSrForm();
      } else if (type === 'SWC_ON') {
        renderSwcOnForm();
      } else if (type === 'SWC_OFF') {
        renderSwcOffForm();
      } else if (type === 'WP') {
        renderWpForm();
      } else if (type === 'WSP') {
        renderWspForm();
      } else {
        formPanel.innerHTML = `<h3>${type}</h3><p class="note">Form not configured yet.</p>`;
        formPanel.style.display = 'block';
      }
    });

    initDropdowns();
  
