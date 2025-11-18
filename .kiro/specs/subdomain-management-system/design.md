# Design Document - Subdomain Management System

## Overview

The Subdomain Management System is a collection of three bash scripts that automate the creation, configuration, and management of subdomains on a VPS server. The system provides a complete solution for setting up Nginx reverse proxies with SSL certificates, managing existing subdomain configurations, and integrating with Cloudflare DNS for the openplp.org domain.

The design follows Unix philosophy principles: each script does one thing well, scripts are composable, and output is designed for both human readability and potential automation. The system leverages existing Linux tools (Nginx, Certbot, systemd) rather than reinventing functionality.

### Key Design Principles

1. **Idempotency**: Scripts can be run multiple times safely without causing issues
2. **Fail-Fast**: Validation happens early, errors stop execution immediately
3. **Transparency**: All actions are logged and displayed to the user
4. **Safety**: Backups are created before modifications, validation before applying changes
5. **Simplicity**: Minimal dependencies, standard Linux tools only

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   setup-     │  │   quick-     │  │   manage-    │     │
│  │  subdomain   │  │  subdomain   │  │  subdomains  │     │
│  │     .sh      │  │     .sh      │  │     .sh      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────┬──────────────────┬──────────────────┬─────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Core Functions Layer                       │
│  • Input Validation    • Nginx Configuration                │
│  • Dependency Check    • SSL Management                     │
│  • Error Handling      • File Operations                    │
└────────┬──────────────────┬──────────────────┬─────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              System Integration Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Nginx   │  │ Certbot  │  │ Systemd  │  │   UFW    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Script Responsibilities

**setup-subdomain.sh** (Interactive Setup)
- Guided configuration wizard with prompts
- Full feature set including authentication
- Detailed confirmation and summary
- Best for first-time users and complex setups

**quick-subdomain.sh** (Command-line Tool)
- Non-interactive, argument-based
- Fast execution for automation
- Minimal prompts, sensible defaults
- Best for experienced users and scripts

**manage-subdomains.sh** (Management Interface)
- Menu-driven interface for existing subdomains
- View, enable, disable, remove operations
- Log viewing and connection testing
- Best for ongoing maintenance

## Components and Interfaces

### 1. Input Validation Module

**Functions:**
```bash
validate_domain() {
  # Validates domain format against DNS standards
  # Returns: 0 (valid) or 1 (invalid)
}

validate_port() {
  # Validates port number is between 1-65535
  # Returns: 0 (valid) or 1 (invalid)
}

check_root() {
  # Verifies script is running with root privileges
  # Exits with error if not root
}
```

**Implementation Details:**
- Domain validation uses regex pattern: `^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$`
- Port validation checks numeric range and format
- Root check uses `$EUID` environment variable
- All validation happens before any system modifications

### 2. Dependency Management Module

**Functions:**
```bash
command_exists() {
  # Checks if a command is available in PATH
  # Args: command_name
  # Returns: 0 (exists) or 1 (not found)
}

install_dependencies() {
  # Installs Nginx and Certbot if not present
  # Updates package lists before installation
  # Enables and starts services after installation
}
```

**Implementation Details:**
- Uses `command -v` for reliable command detection
- Installs via `apt` package manager (Ubuntu/Debian)
- Packages: nginx, certbot, python3-certbot-nginx, apache2-utils (for htpasswd)
- Enables services with `systemctl enable` and `systemctl start`
- Silent installation with `-qq` and `-y` flags

### 3. Nginx Configuration Module

**Functions:**
```bash
create_nginx_config() {
  # Creates Nginx reverse proxy configuration
  # Args: subdomain, target_host, target_port, protocol
  # Creates: /etc/nginx/sites-available/[subdomain]
}

enable_nginx_site() {
  # Creates symbolic link to enable site
  # Tests configuration before reloading
  # Reloads Nginx if test passes
}

test_nginx_config() {
  # Validates Nginx configuration syntax
  # Returns: 0 (valid) or 1 (invalid)
}
```

**Configuration Template:**
```nginx
server {
    listen 80;
    server_name [SUBDOMAIN];
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/nginx/[SUBDOMAIN]_access.log;
    error_log /var/log/nginx/[SUBDOMAIN]_error.log;
    
    location / {
        proxy_pass [PROTOCOL]://[HOST]:[PORT];
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
}
```

**Implementation Details:**
- Configuration files stored in `/etc/nginx/sites-available/`
- Symbolic links in `/etc/nginx/sites-enabled/` for active sites
- Uses heredoc for clean configuration generation
- Validates with `nginx -t` before applying
- Reloads with `systemctl reload nginx` (graceful, no downtime)

### 4. SSL Certificate Module

**Functions:**
```bash
install_ssl() {
  # Requests and installs Let's Encrypt SSL certificate
  # Args: subdomain, email
  # Uses: Certbot with nginx plugin
}

check_ssl_status() {
  # Checks if SSL certificate exists and is valid
  # Returns: certificate expiration date
}
```

**Implementation Details:**
- Uses Certbot with `--nginx` plugin for automatic configuration
- Non-interactive mode with `--non-interactive` flag
- Automatic HTTP to HTTPS redirect with `--redirect` flag
- Agrees to terms of service with `--agree-tos`
- Retry logic: 3 attempts with 30-second delays
- Automatic renewal configured via systemd timer (certbot.timer)
- Certificate storage: `/etc/letsencrypt/live/[subdomain]/`

**SSL Installation Flow:**
```
1. Verify DNS points to server
2. Execute certbot --nginx -d [subdomain]
3. Certbot validates domain ownership (HTTP-01 challenge)
4. Certificate issued and installed
5. Nginx configuration updated with SSL directives
6. Nginx reloaded
```

### 5. Authentication Module

**Functions:**
```bash
setup_basic_auth() {
  # Creates htpasswd file for HTTP Basic Authentication
  # Args: subdomain, username, password
  # Creates: /etc/nginx/.htpasswd_[subdomain]
}

add_auth_to_config() {
  # Adds auth_basic directives to Nginx configuration
  # Args: config_file, htpasswd_file
}
```

**Implementation Details:**
- Uses `htpasswd` command from apache2-utils package
- Password hashing with bcrypt algorithm (`-c` flag)
- File permissions: 640 (owner read/write, group read)
- File ownership: root:www-data
- Auth directives added to location block in Nginx config

**Authentication Configuration:**
```nginx
location / {
    # Basic Authentication
    auth_basic "Restricted Access";
    auth_basic_user_file /etc/nginx/.htpasswd_[subdomain];
    
    # ... proxy configuration ...
}
```

### 6. Logging and Output Module

**Functions:**
```bash
print_message() {
  # Prints informational message in green
}

print_error() {
  # Prints error message in red
}

print_warning() {
  # Prints warning message in yellow
}

print_success() {
  # Prints success message in green
}
```

**Implementation Details:**
- Uses ANSI color codes for terminal output
- Color variables: RED, GREEN, YELLOW, BLUE, CYAN, NC (no color)
- All output goes to stdout for normal messages
- Errors go to stderr
- Structured format: `[LEVEL] message`

### 7. Webmin Integration Module

**Functions:**
```bash
configure_webmin() {
  # Configures Webmin referer settings for subdomain
  # Only runs when target port is 10000
  # Modifies: /etc/webmin/config
}
```

**Implementation Details:**
- Detects Webmin by checking port 10000 and config file existence
- Backs up config before modification
- Adds subdomain to referers list
- Restarts Webmin service after configuration change
- Handles both new referers line and appending to existing

### 8. Management Operations Module

**Functions:**
```bash
list_subdomains() {
  # Lists all configured subdomains with status
  # Shows: enabled/disabled, SSL status, target
}

enable_subdomain() {
  # Enables a disabled subdomain
  # Creates symbolic link and reloads Nginx
}

disable_subdomain() {
  # Disables an enabled subdomain
  # Removes symbolic link and reloads Nginx
}

remove_subdomain() {
  # Completely removes subdomain configuration
  # Deletes config, symlink, htpasswd, optionally SSL cert
}

view_logs() {
  # Displays subdomain logs
  # Options: last N lines or real-time tail
}

test_subdomain() {
  # Tests subdomain connectivity
  # Checks: DNS resolution, HTTP/HTTPS response, SSL cert
}
```

**Implementation Details:**
- Uses `select` for menu-driven interface
- Confirmation prompts for destructive operations
- Backups created before removal
- Graceful error handling for missing files
- Real-time log viewing with `tail -f`

## Data Models

### File System Structure

```
/etc/nginx/
├── sites-available/
│   ├── subdomain1.openplp.org
│   ├── subdomain2.openplp.org
│   └── ...
├── sites-enabled/
│   ├── subdomain1.openplp.org -> ../sites-available/subdomain1.openplp.org
│   └── ...
├── .htpasswd_subdomain1.openplp.org
└── .htpasswd_subdomain2.openplp.org

/var/log/nginx/
├── subdomain1.openplp.org_access.log
├── subdomain1.openplp.org_error.log
├── subdomain2.openplp.org_access.log
└── subdomain2.openplp.org_error.log

/etc/letsencrypt/
├── live/
│   ├── subdomain1.openplp.org/
│   │   ├── fullchain.pem
│   │   ├── privkey.pem
│   │   └── ...
│   └── subdomain2.openplp.org/
│       └── ...
└── renewal/
    ├── subdomain1.openplp.org.conf
    └── subdomain2.openplp.org.conf

/root/
├── subdomain-setup-subdomain1.openplp.org.txt
└── subdomain-setup-subdomain2.openplp.org.txt
```

### Configuration File Format

Each subdomain has:
- **Config file**: `/etc/nginx/sites-available/[subdomain]`
- **Symlink** (if enabled): `/etc/nginx/sites-enabled/[subdomain]`
- **Access log**: `/var/log/nginx/[subdomain]_access.log`
- **Error log**: `/var/log/nginx/[subdomain]_error.log`
- **Auth file** (optional): `/etc/nginx/.htpasswd_[subdomain]`
- **SSL cert** (optional): `/etc/letsencrypt/live/[subdomain]/`
- **Summary file**: `/root/subdomain-setup-[subdomain].txt`

### Summary File Format

```
=================================================================
Subdomain Setup Summary
=================================================================
Date: [timestamp]
Subdomain: [subdomain]
Target: [protocol]://[host]:[port]
SSL Installed: [yes/no]
Basic Auth: [yes/no]

Configuration Files:
- Nginx Config: /etc/nginx/sites-available/[subdomain]
- Nginx Enabled: /etc/nginx/sites-enabled/[subdomain]
- Access Log: /var/log/nginx/[subdomain]_access.log
- Error Log: /var/log/nginx/[subdomain]_error.log

Access URLs:
- HTTP: http://[subdomain]
- HTTPS: https://[subdomain]

[Optional Authentication Section]
[Optional Useful Commands Section]
[Optional Removal Instructions]
=================================================================
```

## Error Handling

### Error Categories

1. **Validation Errors**
   - Invalid domain format
   - Invalid port number
   - Port not listening
   - Subdomain already exists

2. **Permission Errors**
   - Not running as root
   - File permission denied
   - Cannot write to directory

3. **Dependency Errors**
   - Package installation failed
   - Service start failed
   - Command not found

4. **Configuration Errors**
   - Nginx syntax error
   - Nginx reload failed
   - SSL installation failed

5. **Network Errors**
   - DNS not configured
   - Target service not responding
   - SSL validation failed

### Error Handling Strategy

```bash
set -e  # Exit on error (for critical operations)

# Validation errors: Display message and exit
if ! validate_domain "$SUBDOMAIN"; then
    print_error "Invalid domain format"
    exit 1
fi

# Configuration errors: Test before applying
if nginx -t 2>&1 | grep -q "test is successful"; then
    systemctl reload nginx
else
    print_error "Nginx configuration test failed"
    nginx -t  # Show detailed error
    exit 1
fi

# SSL errors: Continue with HTTP if SSL fails
if ! certbot --nginx -d "$SUBDOMAIN" ...; then
    print_warning "SSL installation failed. Site available via HTTP only"
    # Continue execution
fi

# Cleanup on error: Remove partial configurations
trap cleanup_on_error EXIT
```

### Recovery Mechanisms

1. **Configuration Backups**: Created before modifications
2. **Rollback**: Restore backup if validation fails
3. **Graceful Degradation**: Continue with HTTP if SSL fails
4. **Retry Logic**: SSL installation retries 3 times
5. **Safe Removal**: Backups created before deletion

## Testing Strategy

### Manual Testing Checklist

**Setup Script (setup-subdomain.sh):**
- [ ] Interactive prompts work correctly
- [ ] Domain validation rejects invalid formats
- [ ] Port validation rejects invalid ports
- [ ] Nginx configuration is created correctly
- [ ] SSL installation succeeds with valid DNS
- [ ] Basic authentication works when enabled
- [ ] Summary file is created with correct information
- [ ] Webmin configuration updates for port 10000

**Quick Script (quick-subdomain.sh):**
- [ ] Command-line arguments parsed correctly
- [ ] Usage message displays for invalid arguments
- [ ] Port listening check works
- [ ] Configuration created without prompts
- [ ] SSL installation works with email argument
- [ ] Script completes in under 30 seconds

**Management Script (manage-subdomains.sh):**
- [ ] Menu displays correctly
- [ ] List shows all subdomains with correct status
- [ ] Enable/disable operations work
- [ ] Log viewing displays correct logs
- [ ] Test connection shows HTTP/HTTPS status
- [ ] Remove operation cleans up all files
- [ ] SSL certificate management works

### Integration Testing

**End-to-End Scenarios:**
1. Create subdomain → Add DNS → Verify HTTPS access
2. Create subdomain with auth → Test authentication
3. Create multiple subdomains → Manage via interface
4. Remove subdomain → Verify cleanup complete
5. SSL renewal → Verify automatic renewal works

### Test Environments

- **Development**: Local VM with Ubuntu 24.04
- **Staging**: Test VPS with test domain
- **Production**: 157.10.73.52 with openplp.org

## Security Considerations

### Input Sanitization

- Domain names validated against strict regex
- Port numbers validated as integers in valid range
- No shell injection possible (all inputs validated)
- File paths use absolute paths, no user-controlled paths

### Privilege Management

- Scripts require root privileges (checked at start)
- File permissions set explicitly (640 for htpasswd, 600 for summaries)
- Nginx runs as www-data user (non-root)
- SSL certificates owned by root

### Secrets Management

- Passwords hashed with bcrypt before storage
- htpasswd files have restricted permissions (640)
- SSL private keys protected by Certbot (600 permissions)
- No passwords logged or displayed in output

### Network Security

- Security headers configured by default
- SSL/TLS enforced when certificates installed
- HTTP to HTTPS redirect automatic
- WebSocket support doesn't compromise security

### Firewall Configuration

- UFW configured to allow Nginx Full (ports 80, 443)
- No additional ports opened
- Existing firewall rules preserved

## Performance Optimization

### Script Execution Speed

- Minimal external command calls
- Parallel operations where possible
- Efficient regex patterns
- No unnecessary loops or iterations

### Nginx Performance

- Buffer sizes optimized for typical use cases
- Timeout values balanced for reliability and performance
- Connection reuse enabled
- Gzip compression (configured separately)

### SSL Performance

- Certificate caching by Nginx
- OCSP stapling (configured by Certbot)
- Session resumption enabled
- Modern cipher suites

## Deployment and Operations

### Installation

```bash
# 1. Upload scripts to VPS
scp *.sh root@157.10.73.52:/root/subdomain-tools/

# 2. Make executable
chmod +x /root/subdomain-tools/*.sh

# 3. Run setup
cd /root/subdomain-tools
./setup-subdomain.sh
```

### Maintenance Tasks

**Daily:**
- Monitor Nginx error logs
- Check disk space

**Weekly:**
- Review access logs for anomalies
- Verify all subdomains responding

**Monthly:**
- Update system packages
- Review SSL certificate expiration dates
- Test backup restoration

### Monitoring

**Health Checks:**
```bash
# Check Nginx status
systemctl status nginx

# Test all configurations
nginx -t

# List SSL certificates
certbot certificates

# Check disk space
df -h
```

**Log Monitoring:**
```bash
# Watch error logs
tail -f /var/log/nginx/*_error.log

# Check for SSL renewal issues
journalctl -u certbot.timer
```

### Backup Strategy

- Configuration files backed up before modifications
- Backup location: Same directory with `.backup.TIMESTAMP` suffix
- SSL certificates backed up by Certbot
- Summary files serve as configuration documentation
- Recommended: Daily backup of `/etc/nginx/` to remote location

## Future Enhancements

1. **Configuration Templates**: Support for different application types
2. **Load Balancing**: Multiple backend servers for one subdomain
3. **Rate Limiting**: Built-in rate limiting configuration
4. **Monitoring Integration**: Automatic setup of monitoring endpoints
5. **Docker Support**: Automatic detection and configuration for Docker containers
6. **Database Integration**: Track configurations in SQLite database
7. **Web UI**: Optional web interface for management
8. **API**: RESTful API for programmatic access
9. **Multi-domain Support**: Support for domains beyond openplp.org
10. **Automated Testing**: Unit tests for bash functions
