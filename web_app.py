#!/usr/bin/env python3
"""
Azure Key Vault Comparator - Web Version
A simple web-based interface for comparing Azure Key Vault secrets
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from typing import Dict, List, Optional
import threading
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

from azure.identity import AzureCliCredential
from azure.keyvault.secrets import SecretClient
from azure.core.exceptions import ResourceNotFoundError, ClientAuthenticationError
import azure.mgmt.resource as resource
from azure.mgmt.resource import ResourceManagementClient

class KeyVaultComparator:
    def __init__(self):
        self.credential = None
        self.vaults = []
        self.source_vault = None
        self.target_vault = None
        self.source_secrets = {}
        self.target_secrets = {}
        self.source_metadata = {}
        self.target_metadata = {}
        self.cache_file = "vault_cache.json"
        
        # Initialize Azure credential
        self.initialize_azure_credential()
        
    def initialize_azure_credential(self):
        """Initialize Azure credential using Azure CLI stored credentials"""
        try:
            self.credential = AzureCliCredential()
            return True
        except Exception as e:
            print(f"Failed to authenticate with Azure CLI credentials: {e}")
            print("Please run 'az login' first to authenticate.")
            return False
    
    def get_subscriptions(self) -> List[Dict[str, str]]:
        """Get list of accessible subscriptions"""
        try:
            result = subprocess.run(['az', 'account', 'list', '--query', '[].{id:id, name:name, state:state}', '-o', 'json'], 
                                  capture_output=True, text=True)
            if result.returncode != 0:
                print("Please run 'az login' first")
                return []
            
            subscriptions = json.loads(result.stdout)
            # Filter out disabled subscriptions
            active_subscriptions = [sub for sub in subscriptions if sub.get('state') == 'Enabled']
            return active_subscriptions
            
        except Exception as e:
            print(f"Failed to get subscriptions: {e}")
            return []
    
    def get_accessible_vaults(self, subscription_id: str = None) -> List[str]:
        """Get list of accessible Key Vaults from a specific subscription or all subscriptions"""
        if not self.credential:
            if not self.initialize_azure_credential():
                return []
        
        try:
            vaults = []
            
            if subscription_id:
                # Get vaults from specific subscription
                vaults = self._get_vaults_from_subscription(subscription_id)
            else:
                # Get vaults from all subscriptions
                subscriptions = self.get_subscriptions()
                for subscription in subscriptions:
                    sub_vaults = self._get_vaults_from_subscription(subscription['id'])
                    # Add subscription name as prefix to avoid conflicts
                    for vault in sub_vaults:
                        vaults.append(f"{subscription['name']}: {vault}")
            
            return vaults
            
        except Exception as e:
            print(f"Failed to get vaults: {e}")
            return []
    
    def _get_vaults_from_subscription(self, subscription_id: str) -> List[str]:
        """Get vaults from a specific subscription"""
        try:
            # Initialize resource management client for this subscription
            resource_client = ResourceManagementClient(self.credential, subscription_id)
            
            # Get all Key Vaults
            vaults = []
            for resource_group in resource_client.resource_groups.list():
                for resource in resource_client.resources.list_by_resource_group(resource_group.name):
                    if resource.type == "Microsoft.KeyVault/vaults":
                        vaults.append(resource.name)
            
            return vaults
            
        except Exception as e:
            print(f"Failed to get vaults from subscription {subscription_id}: {e}")
            return []
    
    def load_vault_secrets(self, vault_name: str) -> tuple[Dict[str, str], Dict[str, Dict]]:
        """Load secrets and metadata from a vault"""
        try:
            # Handle subscription-prefixed vault names
            actual_vault_name = vault_name
            if ': ' in vault_name:
                actual_vault_name = vault_name.split(': ', 1)[1]
            
            vault_url = f"https://{actual_vault_name}.vault.azure.net/"
            client = SecretClient(vault_url, self.credential)
            
            secrets = {}
            metadata = {}
            
            for secret_properties in client.list_properties_of_secrets():
                secret = client.get_secret(secret_properties.name)
                secrets[secret.name] = secret.value
                
                # Extract metadata
                metadata[secret.name] = {
                    'created': secret.properties.created_on.isoformat() if secret.properties.created_on else None,
                    'modified': secret.properties.updated_on.isoformat() if secret.properties.updated_on else None,
                    'version': secret.properties.version,
                    'enabled': secret.properties.enabled,
                    'expires': secret.properties.expires_on.isoformat() if secret.properties.expires_on else None,
                    'tags': secret.properties.tags or {}
                }
            
            return secrets, metadata
            
        except Exception as e:
            print(f"Failed to load secrets from {vault_name}: {e}")
            return {}, {}
    
    def sync_secret(self, secret_name: str, secret_value: str, target_vault_name: str, dry_run: bool = False) -> bool:
        """Sync a single secret to target vault"""
        try:
            # Handle subscription-prefixed vault names
            actual_vault_name = target_vault_name
            if ': ' in target_vault_name:
                actual_vault_name = target_vault_name.split(': ', 1)[1]
            
            if not dry_run:
                vault_url = f"https://{actual_vault_name}.vault.azure.net/"
                client = SecretClient(vault_url, self.credential)
                client.set_secret(secret_name, secret_value)
            return True
        except Exception as e:
            print(f"Failed to sync secret {secret_name}: {e}")
            return False
    
    def sync_all_secrets(self, target_vault_name: str, dry_run: bool = False) -> Dict[str, bool]:
        """Sync all secrets from source to target"""
        results = {}
        for name, value in self.source_secrets.items():
            results[name] = self.sync_secret(name, value, target_vault_name, dry_run)
        return results

class WebHandler(BaseHTTPRequestHandler):
    def __init__(self, comparator, *args, **kwargs):
        self.comparator = comparator
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/':
            self.serve_static_file('index.html', 'text/html')
        elif self.path == '/styles.css':
            self.serve_static_file('styles.css', 'text/css')
        elif self.path == '/app.js':
            self.serve_static_file('app.js', 'application/javascript')
        elif self.path == '/api/subscriptions':
            self.serve_subscriptions()
        elif self.path == '/api/vaults':
            self.serve_vaults()
        elif self.path.startswith('/api/vaults?'):
            self.serve_vaults()
        elif self.path.startswith('/api/secrets/'):
            vault_name = self.path.split('/')[-1]
            self.serve_secrets(vault_name)
        elif self.path.startswith('/api/sync/'):
            parts = self.path.split('/')
            vault_name = parts[-2]
            secret_name = parts[-1].split('?')[0]  # Remove query parameters
            self.serve_sync_secret(vault_name, secret_name)
        else:
            self.send_error(404)
    
    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/api/sync-all':
            self.handle_sync_all()
        elif self.path == '/api/export':
            self.handle_export()
        elif self.path.startswith('/api/update-secret/'):
            parts = self.path.split('/')
            vault_name = parts[-2]
            secret_name = parts[-1]
            self.handle_update_secret(vault_name, secret_name)
        else:
            self.send_error(404)
    
    def serve_static_file(self, filename, content_type):
        """Serve static files"""
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', content_type)
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404)
    
    def serve_subscriptions(self):
        """Serve list of available subscriptions"""
        subscriptions = self.comparator.get_subscriptions()
        self.send_json_response(subscriptions)
    
    def serve_vaults(self):
        """Serve list of available vaults"""
        # Check for subscription parameter
        subscription_id = None
        if '?' in self.path:
            query_params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            subscription_id = query_params.get('subscription', [None])[0]
        
        vaults = self.comparator.get_accessible_vaults(subscription_id)
        self.send_json_response(vaults)
    
    def serve_secrets(self, vault_name):
        """Serve secrets from a specific vault"""
        secrets, metadata = self.comparator.load_vault_secrets(vault_name)
        self.send_json_response({
            'secrets': secrets,
            'metadata': metadata
        })
    
    def serve_sync_secret(self, vault_name, secret_name):
        """Sync a specific secret"""
        dry_run = self.path.endswith('true')
        
        # Get the secret value from source vault
        source_vault_name = self.get_source_vault_name()
        if not source_vault_name:
            self.send_json_response({'success': False, 'error': 'No source vault selected'})
            return
            
        secrets, _ = self.comparator.load_vault_secrets(source_vault_name)
        secret_value = secrets.get(secret_name, '')
        
        if not secret_value:
            self.send_json_response({'success': False, 'error': f'Secret {secret_name} not found in source vault'})
            return
        
        success = self.comparator.sync_secret(secret_name, secret_value, vault_name, dry_run)
        self.send_json_response({'success': success})
    
    def get_source_vault_name(self):
        """Get the currently selected source vault name from the request"""
        # This is a simplified approach - in a real app you'd pass this in the request
        # For now, we'll get it from the query parameters
        if '?' in self.path:
            query_params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            return query_params.get('source_vault', [None])[0]
        return None
    
    def handle_sync_all(self):
        """Handle sync all request"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        dry_run = data.get('dry_run', False)
        target_vault = data.get('target_vault', '')
        results = self.comparator.sync_all_secrets(target_vault, dry_run)
        
        self.send_json_response({'results': results})
    
    def handle_export(self):
        """Handle export request"""
        # Export functionality would go here
        pass
    
    def handle_update_secret(self, vault_name, secret_name):
        """Handle updating a secret value"""
        try:
            # Read the request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            new_value = data.get('value')
            if not new_value:
                self.send_json_response({'success': False, 'error': 'No value provided'})
                return
            
            # Update the secret in the vault
            vault_url = f"https://{vault_name}.vault.azure.net/"
            client = SecretClient(vault_url=vault_url, credential=self.comparator.credential)
            
            # Set the secret (this will create or update it)
            client.set_secret(secret_name, new_value)
            
            self.send_json_response({
                'success': True, 
                'message': f'Secret {secret_name} updated successfully'
            })
            
        except Exception as e:
            self.send_json_response({'success': False, 'error': str(e)})
    
    def send_json_response(self, data):
        """Send JSON response"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def log_message(self, format, *args):
        """Suppress default logging"""
        pass

def create_handler(comparator):
    """Create a handler with the comparator instance"""
    def handler(*args, **kwargs):
        return WebHandler(comparator, *args, **kwargs)
    return handler

def main():
    """Main function to start the web server"""
    print("Starting Azure Key Vault Comparator...")
    
    # Initialize comparator
    comparator = KeyVaultComparator()
    
    # Create HTTP server
    port = 8899
    handler = create_handler(comparator)
    httpd = HTTPServer(('localhost', port), handler)
    
    print(f"Server running at http://localhost:{port}")
    print("Opening browser...")
    
    # Open browser
    webbrowser.open(f'http://localhost:{port}')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.shutdown()

if __name__ == "__main__":
    main()
