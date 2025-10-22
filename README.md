# Azure Key Vault Comparator

A web application for comparing and managing Azure Key Vault secrets across different environments.

## Features

- **Dual-pane comparison**: Compare secrets between two Key Vaults side by side
- **Color-coded highlighting**:
  - 🟢 Green: Secrets with matching values
  - 🟠 Orange: Secrets with different values
  - 🔴 Red: Secrets only in target vault
  - 🔵 Blue: Secrets only in source vault
- **Metadata display**: Show creation date, last modified, expiration, and tags
- **Secret visibility toggle**: Hide/show secret values for security
- **Dry run mode**: Preview changes without applying them
- **Individual sync**: Sync specific secrets with per-row buttons
- **Bulk sync**: Sync all changes at once
- **Export/Import**: Export vaults to JSON and import them elsewhere
- **Vault caching**: Cache vault lists to avoid repeated API calls

## Prerequisites

1. **Python 3.8+**
2. **Azure CLI** installed and authenticated (`az login`)
3. **Access to Azure Key Vaults** you want to compare

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. **Authenticate with Azure**:
   ```bash
   az login
   ```

2. **Run the web application**:
   ```bash
   python web_app.py
   ```

3. **Open your browser** to `http://localhost:8899` (should open automatically)

4. **Select vaults**:
   - Choose a source vault from the left dropdown
   - Choose a target vault from the right dropdown
   - Click "Refresh Vaults" if your vaults don't appear

5. **Compare secrets**:
   - The application will automatically load and compare secrets
   - Use checkboxes to toggle secret visibility and metadata display
   - Enable "Dry Run Mode" to preview changes without applying them

6. **Sync changes**:
   - Use individual sync buttons for specific secrets
   - Use "Sync All Changes" for bulk operations
   - Export/import vaults using the bottom buttons

## Color Legend

- **✓ Green**: Secret values match between source and target
- **⚠ Orange**: Secret values differ between source and target
- **✗ Red**: Secret exists in target but not in source
- **+ Blue**: Secret exists in source but not in target

## Export Format

Exported vaults are saved as JSON files with the following structure:

```json
{
  "vault_name": "your-vault-name",
  "secrets": {
    "secret-name": "secret-value"
  },
  "metadata": {
    "secret-name": {
      "created": "2024-01-01T00:00:00",
      "modified": "2024-01-01T00:00:00",
      "version": "1.0",
      "enabled": true,
      "expires": null,
      "tags": {}
    }
  },
  "export_date": "2024-01-01T00:00:00",
  "exported_by": "Azure Key Vault Comparator"
}
```

## Security Notes

- The application uses Azure CLI stored credentials
- Secret values can be hidden using the visibility toggle
- All operations respect Azure Key Vault permissions
- Dry run mode allows safe testing of operations

## Troubleshooting

- **Authentication errors**: Ensure you're logged in with `az login`
- **Vault not found**: Check that you have access to the vault and it exists
- **Permission errors**: Verify you have the necessary Key Vault permissions
- **Empty vault list**: Click "Refresh Vaults" to reload the list

## Requirements

- `customtkinter==5.2.2` - Modern UI framework
- `azure-identity==1.15.0` - Azure authentication
- `azure-keyvault-secrets==4.7.0` - Key Vault secret management
- `azure-mgmt-resource==23.0.1` - Resource management
- `python-dotenv==1.0.0` - Environment variable management
