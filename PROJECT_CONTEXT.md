# Azure Key Vault Comparator - Project Context

## Project Overview
I'm working on an Azure Key Vault Comparator web application built with Python (Flask-like HTTP server) and vanilla HTML/CSS/JavaScript. The application helps compare and sync secrets between Azure Key Vaults across multiple subscriptions.

## Current Status
- **Version**: "version one" (committed to git: 8892496)
- **Status**: Fully functional application ready for UX improvements
- **Location**: `/Users/mark/source/keyvault-compare/`
- **Running on**: http://localhost:8899

## Project Structure
```
keyvault-compare/
├── .gitignore          # Excludes .venv, cache files
├── README.md           # Complete documentation
├── app.js              # Frontend JavaScript (362 lines)
├── index.html          # Clean HTML structure (67 lines)
├── requirements.txt    # Python dependencies
├── styles.css          # All CSS styling (150+ lines)
└── web_app.py          # Backend Python application (336 lines)
```

## Key Features Implemented
✅ **Multi-subscription support** - View vaults across all Azure subscriptions
✅ **Separate subscription selectors** - Independent source and target subscription selection  
✅ **Alphabetically sorted subscriptions** - Easy navigation
✅ **Performance optimizations** - No slow "All Subscriptions" loading
✅ **Complete sync functionality**:
   - 🟠 Orange secrets (different values) → "Sync" button
   - 🔵 Blue secrets (missing in target) → "Add to Target" button
   - 🟢 Green secrets (matching) → No button needed
   - 🔴 Red secrets (target-only) → No button needed
✅ **Loading indicators** - Clear feedback on operations
✅ **Word wrapping** - Long secrets display properly
✅ **Clean file structure** - Separated HTML, CSS, JavaScript
✅ **Robust error handling** - Clear error messages and proper URL parsing

## Technical Details
- **Backend**: Python with Azure SDK (azure-identity, azure-keyvault-secrets, azure-mgmt-resource)
- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **Authentication**: Uses Azure CLI stored credentials (`az login`)
- **Port**: 8899
- **Dependencies**: See requirements.txt

## Current UI Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Source Subscription: [All Subscriptions ▼]                 │
│ Source Vault:        [Select source vault... ▼]             │
│ Target Subscription: [All Subscriptions ▼]                 │
│ Target Vault:        [Select target vault... ▼]             │
│                    [Refresh All]                            │
├─────────────────────────────────────────────────────────────┤
│ [✓] Show Secrets  [✓] Show Metadata  [✓] Dry Run Mode     │
├─────────────────────────────────────────────────────────────┤
│ Source Vault Secrets    │    Target Vault Secrets          │
│ (Left pane)             │    (Right pane with color coding)│
├─────────────────────────────────────────────────────────────┤
│ [Sync All Changes] [Export Target Vault] [Import to Target]│
└─────────────────────────────────────────────────────────────┘
```

## Recent Fixes Completed
- Fixed URL parsing issue for sync operations
- Added sync buttons for missing secrets (blue secrets)
- Implemented proper error handling and loading indicators
- Fixed performance issues with subscription filtering
- Added word wrapping for long secret values

## Next Phase: UX Improvements
The application is fully functional and ready for UX enhancements. The user wants to make UX changes and has a git checkpoint to roll back to if needed.

## Git Commands for Reference
- Current commit: `8892496` ("version one")
- Rollback: `git reset --hard 8892496`
- Check changes: `git diff 8892496`
- Run app: `source .venv/bin/activate && python web_app.py`

## Key Files to Modify for UX Changes
- `styles.css` - Visual styling and layout
- `index.html` - HTML structure and layout
- `app.js` - Frontend behavior and interactions
- `web_app.py` - Backend API if needed

The application is production-ready and the user is looking to improve the user experience through UI/UX enhancements.
