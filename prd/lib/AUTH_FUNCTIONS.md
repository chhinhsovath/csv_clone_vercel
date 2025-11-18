# HTTP Basic Authentication Functions

This document describes the HTTP Basic Authentication functions available in the Subdomain Management System.

## Overview

The authentication module provides functions to secure subdomains with HTTP Basic Authentication using bcrypt-hashed passwords stored in htpasswd files.

## Functions

### create_htpasswd(subdomain, username, password)

Creates an htpasswd file with bcrypt hashing for a subdomain.

**Parameters:**
- `subdomain` - The subdomain name
- `username` - Username for authentication
- `password` - Password (will be hashed with bcrypt)

**Returns:** 0 if successful, 1 if failed

**Features:**
- Automatically installs apache2-utils if htpasswd command is not available
- Uses bcrypt hashing (-B flag) for secure password storage
- Sets file permissions to 640 (owner read/write, group read)
- Sets ownership to root:root
- Creates backup if file already exists
- Prompts for confirmation before overwriting existing files

**Example:**
```bash
create_htpasswd "api.openplp.org" "admin" "secure_password"
```

### add_auth_to_config(subdomain)

Adds auth_basic directives to the nginx configuration file.

**Parameters:**
- `subdomain` - The subdomain name

**Returns:** 0 if successful, 1 if failed

**Features:**
- Adds `auth_basic "Restricted Access"` directive
- Adds `auth_basic_user_file` directive pointing to htpasswd file
- Creates backup before modification
- Tests nginx configuration before applying
- Rolls back on failure
- Reloads nginx after successful configuration

**Example:**
```bash
add_auth_to_config "api.openplp.org"
```

### setup_basic_auth(subdomain, username, password)

Combined function that creates htpasswd file and adds auth directives to nginx config.

**Parameters:**
- `subdomain` - The subdomain name
- `username` - Username for authentication
- `password` - Password (will be hashed with bcrypt)

**Returns:** 0 if successful, 1 if failed

**Example:**
```bash
setup_basic_auth "api.openplp.org" "admin" "secure_password"
```

### setup_basic_auth_interactive(subdomain)

Interactive version that prompts for username and password with confirmation.

**Parameters:**
- `subdomain` - The subdomain name

**Returns:** 0 if successful, 1 if failed

**Features:**
- Prompts for username (default: admin)
- Prompts for password with no echo (secure input)
- Prompts for password confirmation
- Validates password match
- Repeats password prompt if passwords don't match

**Example:**
```bash
setup_basic_auth_interactive "api.openplp.org"
```

### remove_basic_auth(subdomain)

Removes HTTP Basic Authentication from a subdomain.

**Parameters:**
- `subdomain` - The subdomain name

**Returns:** 0 if successful, 1 if failed

**Features:**
- Removes auth_basic directives from nginx config
- Creates backup before modification
- Tests nginx configuration before applying
- Rolls back on failure
- Removes htpasswd file
- Reloads nginx after successful removal

**Example:**
```bash
remove_basic_auth "api.openplp.org"
```

### is_auth_configured(subdomain)

Checks if HTTP Basic Authentication is configured for a subdomain.

**Parameters:**
- `subdomain` - The subdomain name

**Returns:** 0 if configured, 1 if not configured

**Example:**
```bash
if is_auth_configured "api.openplp.org"; then
    echo "Authentication is enabled"
else
    echo "Authentication is not enabled"
fi
```

## File Locations

- **htpasswd files:** `/etc/nginx/.htpasswd_[subdomain]`
- **File permissions:** 640 (owner: root, group: root)
- **Nginx configs:** `/etc/nginx/sites-available/[subdomain]`

## Security Features

1. **Bcrypt Hashing:** Passwords are hashed using bcrypt algorithm (htpasswd -B flag)
2. **Secure Permissions:** htpasswd files have 640 permissions (readable only by root and nginx group)
3. **No Echo Input:** Password prompts use `read -s` to prevent password display
4. **Password Confirmation:** Interactive mode requires password confirmation
5. **Root Ownership:** All authentication files are owned by root:root

## Requirements Satisfied

This module satisfies the following requirements from the specification:

- **8.1:** Prompts for username and password when authentication is enabled
- **8.2:** Creates htpasswd file at `/etc/nginx/.htpasswd_[subdomain]`
- **8.3:** Adds auth_basic directives to nginx configuration
- **8.4:** Uses bcrypt hashing for password security
- **8.5:** Sets file permissions to 640 with root ownership

## Usage in Scripts

### In setup-subdomain.sh (Interactive)

```bash
source "$(dirname "$0")/lib/common.sh"

# ... after creating nginx config ...

if prompt_confirm "Enable HTTP Basic Authentication?"; then
    if setup_basic_auth_interactive "$subdomain"; then
        print_success "Authentication enabled"
    else
        print_warning "Failed to enable authentication"
    fi
fi
```

### In quick-subdomain.sh (Command-line)

```bash
source "$(dirname "$0")/lib/common.sh"

# Parse command-line arguments for --auth flag
if [ "$enable_auth" = true ]; then
    setup_basic_auth "$subdomain" "$auth_username" "$auth_password"
fi
```

### In manage-subdomains.sh (Management)

```bash
source "$(dirname "$0")/lib/common.sh"

# Menu option to enable/disable authentication
case "$choice" in
    "enable_auth")
        setup_basic_auth_interactive "$selected_subdomain"
        ;;
    "disable_auth")
        remove_basic_auth "$selected_subdomain"
        ;;
    "check_auth")
        if is_auth_configured "$selected_subdomain"; then
            print_success "Authentication is enabled"
        else
            print_info "Authentication is not enabled"
        fi
        ;;
esac
```

## Testing

Test the authentication functions:

```bash
# Test creating htpasswd file
create_htpasswd "test.openplp.org" "testuser" "testpass"

# Verify file exists and has correct permissions
ls -la /etc/nginx/.htpasswd_test.openplp.org

# Test adding auth to config (requires existing nginx config)
add_auth_to_config "test.openplp.org"

# Verify auth directives in config
grep "auth_basic" /etc/nginx/sites-available/test.openplp.org

# Test removal
remove_basic_auth "test.openplp.org"
```

## Error Handling

All functions include comprehensive error handling:

- Input validation (empty parameters)
- File existence checks
- Backup creation before modifications
- Nginx configuration testing
- Automatic rollback on failure
- Clear error messages with hints

## Dependencies

- **apache2-utils:** Provides the `htpasswd` command (automatically installed if missing)
- **nginx:** Web server (should already be installed)
- **bash:** Shell interpreter with read -s support for secure password input
