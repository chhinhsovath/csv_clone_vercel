# Site Management Functions Documentation

This document describes the site management functions implemented in `common.sh` for Task 4 of the Subdomain Management System.

## Overview

The site management module provides robust functions for enabling, disabling, testing, and managing nginx site configurations with automatic backup and rollback capabilities.

## Implemented Functions

### 1. test_nginx_config()

Tests the nginx configuration for syntax errors.

**Usage:**
```bash
test_nginx_config
```

**Returns:**
- `0` if configuration is valid
- `1` if configuration has errors

**Features:**
- Executes `nginx -t` to validate configuration
- Displays detailed error messages if validation fails
- Provides colored output for easy identification

**Requirements Met:** 9.1, 9.2

---

### 2. reload_nginx()

Reloads nginx configuration with error handling.

**Usage:**
```bash
reload_nginx
```

**Returns:**
- `0` if reload successful
- `1` if reload failed

**Features:**
- Uses `systemctl reload nginx` for graceful reload
- Captures and displays error output
- Provides hints for troubleshooting

**Requirements Met:** 4.4, 9.1, 9.2

---

### 3. test_and_reload_nginx()

Tests nginx configuration and reloads only if valid.

**Usage:**
```bash
test_and_reload_nginx
```

**Returns:**
- `0` if test passed and reload successful
- `1` if test failed or reload failed

**Features:**
- Combines testing and reloading in one operation
- Prevents reload if configuration is invalid
- Ensures nginx is never left in a broken state

**Requirements Met:** 9.1, 9.2, 9.3

---

### 4. enable_site(subdomain)

Enables a site by creating a symbolic link in sites-enabled with automatic validation.

**Usage:**
```bash
enable_site "api.openplp.org"
```

**Parameters:**
- `subdomain`: The subdomain to enable

**Returns:**
- `0` if site enabled successfully
- `1` if operation failed

**Features:**
- Checks if configuration file exists
- Detects if site is already enabled
- Creates symbolic link from sites-available to sites-enabled
- Tests nginx configuration after enabling
- **Automatic rollback**: Removes link if nginx test fails

**Requirements Met:** 1.5, 4.3, 9.1, 9.2, 9.3, 9.4

---

### 5. disable_site(subdomain)

Disables a site by removing the symbolic link from sites-enabled.

**Usage:**
```bash
disable_site "api.openplp.org"
```

**Parameters:**
- `subdomain`: The subdomain to disable

**Returns:**
- `0` if site disabled successfully
- `1` if operation failed

**Features:**
- Checks if site is currently enabled
- Removes symbolic link safely
- Tests nginx configuration after disabling
- Warns if configuration issues are detected

**Requirements Met:** 4.3, 9.1, 9.2

---

### 6. enable_site_and_reload(subdomain)

Enables a site and reloads nginx with full rollback on failure.

**Usage:**
```bash
enable_site_and_reload "api.openplp.org"
```

**Parameters:**
- `subdomain`: The subdomain to enable

**Returns:**
- `0` if site enabled and nginx reloaded successfully
- `1` if operation failed

**Features:**
- Tracks previous state (was site already enabled?)
- Enables the site
- Tests nginx configuration
- Reloads nginx
- **Full rollback**: Restores previous state if any step fails

**Requirements Met:** 1.5, 4.3, 4.4, 9.1, 9.2, 9.3, 9.4, 9.5

---

### 7. disable_site_and_reload(subdomain)

Disables a site and reloads nginx with full rollback on failure.

**Usage:**
```bash
disable_site_and_reload "api.openplp.org"
```

**Parameters:**
- `subdomain`: The subdomain to disable

**Returns:**
- `0` if site disabled and nginx reloaded successfully
- `1` if operation failed

**Features:**
- Disables the site
- Tests nginx configuration
- Reloads nginx
- **Full rollback**: Re-enables site if reload fails

**Requirements Met:** 4.3, 4.4, 9.1, 9.2, 9.3, 9.4, 9.5

---

### 8. modify_config_with_backup(subdomain, modification_function)

Modifies a configuration file with automatic backup and rollback.

**Usage:**
```bash
# Define a modification function
add_ssl_config() {
    local subdomain="$1"
    local config_file="$2"
    # Modify the config file here
    echo "listen 443 ssl;" >> "$config_file"
}

# Use the backup wrapper
modify_config_with_backup "api.openplp.org" "add_ssl_config"
```

**Parameters:**
- `subdomain`: The subdomain whose config to modify
- `modification_function`: Name of function that performs the modification

**Returns:**
- `0` if modification successful
- `1` if operation failed

**Features:**
- **Creates timestamped backup** before any modification
- Executes the provided modification function
- Tests nginx configuration after modification
- Reloads nginx if test passes
- **Full rollback**: Restores backup if any step fails
- Preserves backup file for manual recovery

**Requirements Met:** 9.1, 9.2, 9.3, 9.4, 9.5

---

## Error Handling and Rollback

All site management functions implement comprehensive error handling:

### Validation Before Action
- Check if configuration files exist
- Verify current state before making changes
- Validate nginx configuration before reload

### Automatic Rollback
- `enable_site()`: Removes symbolic link if nginx test fails
- `enable_site_and_reload()`: Removes link if reload fails
- `disable_site_and_reload()`: Recreates link if reload fails
- `modify_config_with_backup()`: Restores backup if test or reload fails

### Error Messages
- Clear, colored error messages
- Helpful hints for troubleshooting
- Detailed output from nginx when tests fail

## Usage Examples

### Example 1: Enable a site safely
```bash
#!/bin/bash
source /path/to/common.sh

# Enable site with automatic validation
if enable_site "api.openplp.org"; then
    echo "Site enabled successfully"
else
    echo "Failed to enable site"
    exit 1
fi
```

### Example 2: Enable and reload with rollback
```bash
#!/bin/bash
source /path/to/common.sh

# Enable site and reload nginx
# Automatically rolls back if anything fails
if enable_site_and_reload "api.openplp.org"; then
    echo "Site is now live"
else
    echo "Operation failed, changes rolled back"
    exit 1
fi
```

### Example 3: Modify configuration safely
```bash
#!/bin/bash
source /path/to/common.sh

# Function to add authentication
add_auth() {
    local subdomain="$1"
    local config_file="$2"
    
    # Add auth directives
    sed -i '/location \/ {/a\        auth_basic "Restricted";' "$config_file"
    sed -i '/location \/ {/a\        auth_basic_user_file /etc/nginx/.htpasswd;' "$config_file"
}

# Modify with automatic backup and rollback
if modify_config_with_backup "api.openplp.org" "add_auth"; then
    echo "Authentication added successfully"
else
    echo "Failed to add authentication, config restored"
    exit 1
fi
```

### Example 4: Disable site with reload
```bash
#!/bin/bash
source /path/to/common.sh

# Disable site and reload nginx
if disable_site_and_reload "api.openplp.org"; then
    echo "Site disabled successfully"
else
    echo "Failed to disable site"
    exit 1
fi
```

## Testing

Two test suites are provided:

### 1. test_site_management.sh
Full integration tests (requires nginx installed and root access):
```bash
sudo bash prd/lib/test_site_management.sh
```

### 2. test_site_management_unit.sh
Unit tests (no nginx required, tests logic only):
```bash
bash prd/lib/test_site_management_unit.sh
```

## Requirements Coverage

| Requirement | Function(s) | Status |
|-------------|-------------|--------|
| 1.5 - Enable site | `enable_site()`, `enable_site_and_reload()` | ✅ Complete |
| 4.3 - Enable/disable operations | `enable_site()`, `disable_site()` | ✅ Complete |
| 4.4 - Nginx reload | `reload_nginx()`, `test_and_reload_nginx()` | ✅ Complete |
| 9.1 - Configuration validation | `test_nginx_config()` | ✅ Complete |
| 9.2 - Error handling | All functions | ✅ Complete |
| 9.3 - Reload on success | `test_and_reload_nginx()` | ✅ Complete |
| 9.4 - Configuration backup | `modify_config_with_backup()` | ✅ Complete |
| 9.5 - Rollback on failure | All `*_and_reload()` functions | ✅ Complete |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Scripts                         │
│  (setup-subdomain.sh, quick-subdomain.sh, etc.)        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Site Management Functions                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  enable_site_and_reload()                        │  │
│  │  disable_site_and_reload()                       │  │
│  │  modify_config_with_backup()                     │  │
│  └────────────┬─────────────────────────────────────┘  │
│               │                                          │
│  ┌────────────▼─────────────────────────────────────┐  │
│  │  enable_site()    disable_site()                 │  │
│  │  test_and_reload_nginx()                         │  │
│  └────────────┬─────────────────────────────────────┘  │
│               │                                          │
│  ┌────────────▼─────────────────────────────────────┐  │
│  │  test_nginx_config()                             │  │
│  │  reload_nginx()                                  │  │
│  │  backup_file()                                   │  │
│  │  restore_backup()                                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  System Layer                           │
│  nginx, systemctl, file system                         │
└─────────────────────────────────────────────────────────┘
```

## Best Practices

1. **Always use `*_and_reload()` functions** in production scripts for automatic rollback
2. **Use `modify_config_with_backup()`** when making configuration changes
3. **Check return codes** to handle failures appropriately
4. **Test in development** before deploying to production
5. **Keep backups** - they are automatically created with timestamps

## Future Enhancements

Potential improvements for future versions:
- Parallel site operations
- Batch enable/disable
- Configuration diff before rollback
- Automatic backup cleanup (keep last N backups)
- Dry-run mode for testing changes
