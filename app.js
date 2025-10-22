let sourceSecrets = {};
let targetSecrets = {};
let sourceMetadata = {};
let targetMetadata = {};
let subscriptions = [];

async function loadSubscriptions() {
    try {
        const response = await fetch('/api/subscriptions');
        subscriptions = await response.json();
        
        // Sort subscriptions alphabetically by name
        subscriptions.sort((a, b) => a.name.localeCompare(b.name));
        
        const sourceSubscriptionSelect = document.getElementById('sourceSubscription');
        const targetSubscriptionSelect = document.getElementById('targetSubscription');
        
        // Clear and populate both subscription selects
        sourceSubscriptionSelect.innerHTML = '<option value="">All Subscriptions</option>';
        targetSubscriptionSelect.innerHTML = '<option value="">All Subscriptions</option>';
        
        subscriptions.forEach(sub => {
            const option1 = document.createElement('option');
            option1.value = sub.id;
            option1.textContent = sub.name;
            sourceSubscriptionSelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = sub.id;
            option2.textContent = sub.name;
            targetSubscriptionSelect.appendChild(option2);
        });
        
    } catch (error) {
        showStatus('Failed to load subscriptions: ' + error.message, 'error');
    }
}

async function refreshSourceVaults() {
    const subscriptionId = document.getElementById('sourceSubscription').value;
    const sourceSelect = document.getElementById('sourceVault');
    
    if (!subscriptionId) {
        sourceSelect.innerHTML = '<option value="">Please select a source subscription first</option>';
        return;
    }
    
    try {
        showStatus('Loading source vaults...', 'info');
        sourceSelect.innerHTML = '<option value="">Loading vaults...</option>';
        
        const response = await fetch(`/api/vaults?subscription=${subscriptionId}`);
        const vaults = await response.json();
        
        sourceSelect.innerHTML = '<option value="">Select source vault...</option>';
        
        vaults.forEach(vault => {
            const option = document.createElement('option');
            option.value = vault;
            option.textContent = vault;
            sourceSelect.appendChild(option);
        });
        
        showStatus(`Found ${vaults.length} vaults in source subscription`, 'success');
        
    } catch (error) {
        sourceSelect.innerHTML = '<option value="">Error loading vaults</option>';
        showStatus('Failed to refresh source vaults: ' + error.message, 'error');
    }
}

async function refreshTargetVaults() {
    const subscriptionId = document.getElementById('targetSubscription').value;
    const targetSelect = document.getElementById('targetVault');
    
    if (!subscriptionId) {
        targetSelect.innerHTML = '<option value="">Please select a target subscription first</option>';
        return;
    }
    
    try {
        showStatus('Loading target vaults...', 'info');
        targetSelect.innerHTML = '<option value="">Loading vaults...</option>';
        
        const response = await fetch(`/api/vaults?subscription=${subscriptionId}`);
        const vaults = await response.json();
        
        targetSelect.innerHTML = '<option value="">Select target vault...</option>';
        
        vaults.forEach(vault => {
            const option = document.createElement('option');
            option.value = vault;
            option.textContent = vault;
            targetSelect.appendChild(option);
        });
        
        showStatus(`Found ${vaults.length} vaults in target subscription`, 'success');
        
    } catch (error) {
        targetSelect.innerHTML = '<option value="">Error loading vaults</option>';
        showStatus('Failed to refresh target vaults: ' + error.message, 'error');
    }
}

async function refreshAllVaults() {
    showStatus('Please select subscriptions first, then vaults will load automatically', 'info');
    
    // Clear vault dropdowns
    document.getElementById('sourceVault').innerHTML = '<option value="">Please select a source subscription first</option>';
    document.getElementById('targetVault').innerHTML = '<option value="">Please select a target subscription first</option>';
}

async function loadSecrets(vaultName, isSource) {
    try {
        showStatus(`Loading secrets from ${vaultName}...`, 'info');
        
        const response = await fetch(`/api/secrets/${vaultName}`);
        const data = await response.json();
        
        if (isSource) {
            sourceSecrets = data.secrets;
            sourceMetadata = data.metadata;
            updateUnifiedDisplay();
            showStatus(`Loaded ${Object.keys(sourceSecrets).length} secrets from source vault`, 'success');
        } else {
            targetSecrets = data.secrets;
            targetMetadata = data.metadata;
            updateUnifiedDisplay();
            showStatus(`Loaded ${Object.keys(targetSecrets).length} secrets from target vault`, 'success');
        }
    } catch (error) {
        showStatus(`Failed to load secrets from ${vaultName}: ` + error.message, 'error');
    }
}

function updateUnifiedDisplay() {
    const container = document.getElementById('unifiedSecrets');
    container.innerHTML = '';
    
    const allSecrets = new Set([...Object.keys(sourceSecrets), ...Object.keys(targetSecrets)]);
    const sortedSecrets = Array.from(allSecrets).sort();
    
    sortedSecrets.forEach((name, index) => {
        const row = createUnifiedSecretRow(name, index);
        container.appendChild(row);
    });
}

function createUnifiedSecretRow(name, index) {
    const row = document.createElement('div');
    row.className = 'secret-row';
    row.style.animationDelay = `${index * 0.05}s`;
    row.classList.add('slide-in');
    
    // Create source cell
    const sourceCell = document.createElement('div');
    sourceCell.className = 'secret-cell source-cell';
    
    // Create target cell
    const targetCell = document.createElement('div');
    targetCell.className = 'secret-cell target-cell';
    
    // Determine the state and populate cells
    const hasSource = sourceSecrets[name];
    const hasTarget = targetSecrets[name];
    
    if (hasSource && hasTarget) {
        // Both exist - check if they match
        if (sourceSecrets[name] === targetSecrets[name]) {
            sourceCell.classList.add('match');
            targetCell.classList.add('match');
        } else {
            sourceCell.classList.add('different');
            targetCell.classList.add('different');
        }
        
        populateSecretCell(sourceCell, name, sourceSecrets[name], sourceMetadata[name], 'source');
        populateSecretCell(targetCell, name, targetSecrets[name], targetMetadata[name], 'target');
        
    } else if (hasSource && !hasTarget) {
        // Source only
        sourceCell.classList.add('source-only');
        targetCell.classList.add('empty');
        
        populateSecretCell(sourceCell, name, sourceSecrets[name], sourceMetadata[name], 'source');
        populateEmptyCell(targetCell, name);
        
    } else if (!hasSource && hasTarget) {
        // Target only
        sourceCell.classList.add('empty');
        targetCell.classList.add('target-only');
        
        populateEmptyCell(sourceCell, name);
        populateSecretCell(targetCell, name, targetSecrets[name], targetMetadata[name], 'target');
    }
    
    row.appendChild(sourceCell);
    row.appendChild(targetCell);
    
    return row;
}

function populateSecretCell(cell, name, value, metadata, type) {
    const showSecrets = document.getElementById('showSecrets').checked;
    const showMetadata = document.getElementById('showMetadata').checked;
    
    const displayValue = showSecrets ? value : '***HIDDEN***';
    let metaStr = '';
    
    if (showMetadata && metadata) {
        metaStr = `\nCreated: ${metadata.created || 'Unknown'}\nModified: ${metadata.modified || 'Unknown'}`;
        if (metadata.expires) {
            metaStr += `\nExpires: ${metadata.expires}`;
        }
        if (metadata.tags && Object.keys(metadata.tags).length > 0) {
            metaStr += `\nTags: ${JSON.stringify(metadata.tags)}`;
        }
    }
    
    cell.innerHTML = `
        <div class="secret-content">
            <div class="secret-name">${name}</div>
            <div class="secret-value">${displayValue}${metaStr}</div>
        </div>
        ${getSyncButton(name, type)}
    `;
}

function populateEmptyCell(cell, name) {
    cell.innerHTML = `
        <div class="secret-content">
            <div class="secret-name" style="opacity: 0.5;">${name}</div>
            <div class="secret-value" style="opacity: 0.3; font-style: italic;">No secret found</div>
        </div>
    `;
}

function getSyncButton(name, type) {
    const hasSource = sourceSecrets[name];
    const hasTarget = targetSecrets[name];
    
    if (hasSource && hasTarget) {
        // Both exist - check if they match
        if (sourceSecrets[name] !== targetSecrets[name]) {
            return `<button class="sync-btn" onclick="syncSecret('${name}')">Sync</button>`;
        }
    } else if (hasSource && !hasTarget) {
        // Source only - add to target
        return `<button class="sync-btn" onclick="syncSecret('${name}')">Add to Target</button>`;
    }
    
    return '';
}

async function syncSecret(secretName) {
    const dryRun = document.getElementById('dryRun').checked;
    const targetVault = document.getElementById('targetVault').value;
    const sourceVault = document.getElementById('sourceVault').value;
    
    if (!targetVault) {
        showStatus('Please select a target vault first', 'error');
        return;
    }
    
    if (!sourceVault) {
        showStatus('Please select a source vault first', 'error');
        return;
    }
    
    try {
        const url = `/api/sync/${targetVault}/${secretName}?dry_run=${dryRun}&source_vault=${encodeURIComponent(sourceVault)}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            showStatus(`Secret ${secretName} synced successfully`, 'success');
            loadSecrets(targetVault, false);
        } else {
            showStatus(`Failed to sync secret ${secretName}: ${result.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        showStatus(`Failed to sync secret ${secretName}: ` + error.message, 'error');
    }
}

async function syncAll() {
    const dryRun = document.getElementById('dryRun').checked;
    const targetVault = document.getElementById('targetVault').value;
    
    if (!targetVault) {
        showStatus('Please select a target vault first', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/sync-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                dry_run: dryRun,
                target_vault: targetVault
            })
        });
        const result = await response.json();
        
        const successCount = Object.values(result.results).filter(Boolean).length;
        const totalCount = Object.keys(result.results).length;
        
        showStatus(`Sync completed: ${successCount}/${totalCount} secrets synced`, 'success');
        loadSecrets(targetVault, false);
    } catch (error) {
        showStatus('Failed to sync all secrets: ' + error.message, 'error');
    }
}

function exportVault() {
    const vaultName = document.getElementById('targetVault').value;
    if (!vaultName) {
        showStatus('Please select a target vault first', 'error');
        return;
    }
    
    const exportData = {
        vault_name: vaultName,
        secrets: targetSecrets,
        metadata: targetMetadata,
        export_date: new Date().toISOString(),
        exported_by: 'Azure Key Vault Comparator'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${vaultName}_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showStatus('Vault exported successfully', 'success');
}

function importVault() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (confirm(`Import ${Object.keys(data.secrets).length} secrets to ${document.getElementById('targetVault').value}?`)) {
                // Here you would implement the import functionality
                showStatus('Import functionality not yet implemented', 'error');
            }
        } catch (error) {
            showStatus('Failed to parse import file: ' + error.message, 'error');
        }
    };
    input.click();
}

function toggleSecrets() {
    updateUnifiedDisplay();
    updateUnifiedDisplay();
}

function toggleMetadata() {
    updateUnifiedDisplay();
    updateUnifiedDisplay();
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.style.display = 'block';
    
    // Remove existing type classes
    status.classList.remove('info', 'success', 'error');
    
    // Add new type class
    if (type) {
        status.classList.add(type);
    }
    
    // Add fade-in animation
    status.classList.add('fade-in');
    
    setTimeout(() => {
        status.style.display = 'none';
        status.classList.remove('fade-in');
    }, 4000);
}

// Event listeners
document.getElementById('sourceSubscription').onchange = () => {
    refreshSourceVaults();
};

document.getElementById('targetSubscription').onchange = () => {
    refreshTargetVaults();
};

document.getElementById('sourceVault').onchange = (e) => {
    if (e.target.value) {
        loadSecrets(e.target.value, true);
    }
};

document.getElementById('targetVault').onchange = (e) => {
    if (e.target.value) {
        loadSecrets(e.target.value, false);
    }
};

// Load subscriptions and initialize on page load
loadSubscriptions();
refreshAllVaults();
