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
            updateSourceDisplay();
            showStatus(`Loaded ${Object.keys(sourceSecrets).length} secrets from source vault`, 'success');
        } else {
            targetSecrets = data.secrets;
            targetMetadata = data.metadata;
            updateTargetDisplay();
            showStatus(`Loaded ${Object.keys(targetSecrets).length} secrets from target vault`, 'success');
        }
    } catch (error) {
        showStatus(`Failed to load secrets from ${vaultName}: ` + error.message, 'error');
    }
}

function updateSourceDisplay() {
    const container = document.getElementById('sourceSecrets');
    container.innerHTML = '';
    
    Object.entries(sourceSecrets).forEach(([name, value], index) => {
        const item = createSecretItem(name, value, sourceMetadata[name], 'source');
        item.style.animationDelay = `${index * 0.05}s`;
        item.classList.add('slide-in');
        container.appendChild(item);
    });
}

function updateTargetDisplay() {
    const container = document.getElementById('targetSecrets');
    container.innerHTML = '';
    
    const allSecrets = new Set([...Object.keys(sourceSecrets), ...Object.keys(targetSecrets)]);
    
    Array.from(allSecrets).sort().forEach((name, index) => {
        if (targetSecrets[name]) {
            const value = targetSecrets[name];
            const metadata = targetMetadata[name];
            
            let className = 'match';
            if (sourceSecrets[name]) {
                if (sourceSecrets[name] !== value) {
                    className = 'different';
                }
            } else {
                className = 'target-only';
            }
            
            const item = createSecretItem(name, value, metadata, 'target', className);
            item.style.animationDelay = `${index * 0.05}s`;
            item.classList.add('slide-in');
            container.appendChild(item);
        } else if (sourceSecrets[name]) {
            const value = sourceSecrets[name];
            const metadata = sourceMetadata[name];
            const item = createSecretItem(name, value, metadata, 'source-only', 'source-only');
            item.style.animationDelay = `${index * 0.05}s`;
            item.classList.add('slide-in');
            container.appendChild(item);
        }
    });
}

function createSecretItem(name, value, metadata, type, className = '') {
    const item = document.createElement('div');
    item.className = `secret-item ${className}`;
    
    const showSecrets = document.getElementById('showSecrets').checked;
    const showMetadata = document.getElementById('showMetadata').checked;
    
    const displayValue = showSecrets ? value : '***HIDDEN***';
    let metaStr = '';
    
    if (showMetadata && metadata) {
        metaStr = ` | Created: ${metadata.created ? metadata.created.substring(0, 10) : 'N/A'}`;
        metaStr += ` | Modified: ${metadata.modified ? metadata.modified.substring(0, 10) : 'N/A'}`;
        if (metadata.expires) {
            metaStr += ` | Expires: ${metadata.expires.substring(0, 10)}`;
        }
    }
    
    const content = document.createElement('div');
    content.className = 'secret-content';
    content.innerHTML = `
        <div class="secret-name">${name}</div>
        <div class="secret-value">${displayValue}${metaStr}</div>
    `;
    
    item.appendChild(content);
    
    // Add sync button for secrets that need syncing
    if (type === 'target' && sourceSecrets[name] && sourceSecrets[name] !== value) {
        // Different values - sync button
        const syncBtn = document.createElement('button');
        syncBtn.className = 'sync-btn';
        syncBtn.textContent = 'Sync';
        syncBtn.onclick = () => syncSecret(name);
        item.appendChild(syncBtn);
    } else if (type === 'source-only') {
        // Missing in target - add sync button
        const syncBtn = document.createElement('button');
        syncBtn.className = 'sync-btn';
        syncBtn.textContent = 'Add to Target';
        syncBtn.onclick = () => syncSecret(name);
        item.appendChild(syncBtn);
    }
    return item;
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
    updateSourceDisplay();
    updateTargetDisplay();
}

function toggleMetadata() {
    updateSourceDisplay();
    updateTargetDisplay();
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
