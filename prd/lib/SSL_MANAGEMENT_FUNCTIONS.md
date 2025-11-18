# SSL Certificate Management Functions

This document describes the SSL certificate management functions available in the Subdomain Management System.

## Overview

The SSL management module provides automated SSL certificate installation, status checking, and removal using Let's Encrypt via Certbot. All functions include comprehensive error handling and automatic rollback on failure.

## Functions

### install_ssl

Install an SSL certificate for a subdomain using Certbot with the nginx plugin.

**Syntax:**
```bash
install_ssl <subdomain> <email>
```

**Parameters:**
- `subdomain`: The fully qualified domain name (e.g., api.openplp.org)
- `email`: Email address for Let's Encrypt registration and renewal notifications

**Returns:**
- `0`: SSL certificate installed successfully
- `1`: Installation failed

**Features:**
- Validates email format before proceeding
- Checks if site configuration exists
- Automatically enables the site if not already enabled
- Creates backup before SSL installation
- Configures automatic HTTP to HTTPS redirect
- Adds HSTS header for enhanced security
- Provides detailed error messages with troubleshooting hints
- Automatically rolls back on failure

**Example:**
```bash
install_ssl "api.openplp.org" "admin@example.com"
```

**Error Handling:**
- DNS issues: Suggests checking DNS configuration and propagation
- Port 80 access: Suggests checking firewall and port accessibility
- Rate limits: Informs about Let's Encrypt rate limits
- Automatic backup restoration on failure

---

### check_ssl_status

Check if SSL is configured and valid for a subdomain.

**Syntax:**
```bash
check_ssl_status <subdomain>
```

**Parameters:**
- `subdomain`: The fully qualified domain name

**Returns:**
- `0`: SSL is configured and valid
- `1`: SSL is not configured or invalid

**Features:**
- Checks nginx configuration for SSL
- Verifies certificate exists in Certbot
- Displays certificate details including expiry date
- Checks certificate validity status

**Example:**
```bash
if check_ssl_status "api.openplp.org"; then
    echo "SSL is configured and valid"
else
    echo "SSL is not configured or has issues"
fi
```

---

### list_certificates

List all SSL certificates managed by Certbot.

**Syntax:**
```bash
list_certificates
```

**Returns:**
- `0`: Successfully listed certificates
- `1`: Failed to list certificates

**Features:**
- Displays all certificates with details
- Shows domain names, expiry dates, and paths
- Indicates if no certificates are found
- Requires Certbot to be installed

**Example:**
```bash
list_certificates
```

**Output Example:**
```
Found the following certs:
  Certificate Name: api.openplp.org
    Domains: api.openplp.org
    Expiry Date: 2024-03-15 12:34:56+00:00 (VALID: 89 days)
    Certificate Path: /etc/letsencrypt/live/api.openplp.org/fullchain.pem
    Private Key Path: /etc/letsencrypt/live/api.openplp.org/privkey.pem
```

---

### remove_certificate

Remove an SSL certificate for a subdomain.

**Syntax:**
```bash
remove_certificate <subdomain> [remove_cert]
```

**Parameters:**
- `subdomain`: The fully qualified domain name
- `remove_cert`: Optional. Set to "yes" to skip confirmation prompt, "prompt" (default) to ask

**Returns:**
- `0`: Certificate removed successfully
- `1`: Removal failed

**Features:**
- Prompts for confirmation before removal (unless specified)
- Removes certificate from Certbot
- Automatically updates nginx configuration
- Reloads nginx after removal
- Handles cases where certificate doesn't exist

**Example:**
```bash
# With confirmation prompt
remove_certificate "api.openplp.org"

# Without confirmation prompt
remove_certificate "api.openplp.org" "yes"
```

---

### add_hsts_header

Add HTTP Strict Transport Security (HSTS) header to an SSL-enabled site.

**Syntax:**
```bash
add_hsts_header <subdomain>
```

**Parameters:**
- `subdomain`: The fully qualified domain name

**Returns:**
- `0`: HSTS header added successfully
- `1`: Failed to add header

**Features:**
- Only works on SSL-enabled sites
- Prevents duplicate headers
- Sets max-age to 1 year (31536000 seconds)
- Includes subdomains in HSTS policy
- Automatically placed in SSL server block

**Example:**
```bash
add_hsts_header "api.openplp.org"
```

**HSTS Header Added:**
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

### install_ssl_safe

Install SSL with comprehensive error handling and user-friendly messages.

**Syntax:**
```bash
install_ssl_safe <subdomain> <email>
```

**Parameters:**
- `subdomain`: The fully qualified domain name
- `email`: Email address for Let's Encrypt registration

**Returns:**
- `0`: SSL installed successfully
- `1`: Installation failed

**Features:**
- Wrapper around `install_ssl` with enhanced messaging
- Checks prerequisites before attempting installation
- Provides clear success/failure messages
- Suggests next steps on failure
- Informs user that HTTP access remains available on failure

**Example:**
```bash
install_ssl_safe "api.openplp.org" "admin@example.com"
```

---

### is_ssl_configured

Check if SSL is configured in nginx for a subdomain (internal helper).

**Syntax:**
```bash
is_ssl_configured <subdomain>
```

**Parameters:**
- `subdomain`: The fully qualified domain name

**Returns:**
- `0`: SSL is configured in nginx
- `1`: SSL is not configured

**Features:**
- Checks for "listen 443 ssl" directive in nginx config
- Used internally by other SSL functions
- Fast check without external dependencies

**Example:**
```bash
if is_ssl_configured "api.openplp.org"; then
    echo "SSL is configured"
fi
```

---

## Usage Workflow

### Installing SSL for a New Subdomain

```bash
#!/bin/bash
source /path/to/common.sh

# 1. Create subdomain configuration
create_nginx_config "api.openplp.org" "127.0.0.1" "3000" "http"

# 2. Enable the site
enable_site_and_reload "api.openplp.org"

# 3. Install SSL certificate
install_ssl_safe "api.openplp.org" "admin@example.com"

# 4. Verify SSL status
check_ssl_status "api.openplp.org"
```

### Checking SSL Status

```bash
#!/bin/bash
source /path/to/common.sh

# Check specific subdomain
check_ssl_status "api.openplp.org"

# List all certificates
list_certificates
```

### Removing SSL

```bash
#!/bin/bash
source /path/to/common.sh

# Remove certificate with confirmation
remove_certificate "api.openplp.org"

# Remove certificate without confirmation
remove_certificate "api.openplp.org" "yes"
```

---

## Prerequisites

### Required Software
- **Certbot**: Let's Encrypt certificate management tool
- **python3-certbot-nginx**: Certbot nginx plugin
- **Nginx**: Web server (must be running)

### Installation
```bash
apt-get update
apt-get install -y certbot python3-certbot-nginx
```

Or use the built-in dependency installer:
```bash
source /path/to/common.sh
install_dependencies
```

### DNS Configuration
Before installing SSL certificates:
1. Ensure DNS A record points to your server IP
2. Wait for DNS propagation (5-10 minutes)
3. Verify with: `dig +short subdomain.domain.com`

### Firewall Configuration
Ensure ports are open:
- Port 80 (HTTP): Required for Let's Encrypt validation
- Port 443 (HTTPS): Required for SSL connections

```bash
# UFW example
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## Error Handling

### Common Errors and Solutions

#### DNS Not Propagated
**Error:** "DNS problem: NXDOMAIN looking up A for subdomain.domain.com"

**Solution:**
- Wait 5-10 minutes for DNS propagation
- Verify DNS with: `dig +short subdomain.domain.com`
- Check DNS provider configuration

#### Port 80 Not Accessible
**Error:** "Fetching http://subdomain.domain.com/.well-known/acme-challenge/... Connection refused"

**Solution:**
- Check firewall: `ufw status`
- Verify nginx is running: `systemctl status nginx`
- Ensure port 80 is not blocked by cloud provider

#### Rate Limit Exceeded
**Error:** "too many certificates already issued for exact set of domains"

**Solution:**
- Let's Encrypt limits: 50 certificates per week per domain
- Wait and try again later
- Use staging environment for testing: `certbot --staging`

#### Email Validation Failed
**Error:** "Invalid email format"

**Solution:**
- Provide valid email: `admin@example.com`
- Email is required for certificate expiry notifications

---

## Security Features

### HSTS (HTTP Strict Transport Security)
- Automatically configured for SSL-enabled sites
- Forces browsers to use HTTPS for 1 year
- Includes subdomains in policy
- Prevents SSL stripping attacks

### Automatic HTTPS Redirect
- All HTTP requests automatically redirect to HTTPS
- Configured by Certbot during installation
- Ensures all traffic is encrypted

### Security Headers
All SSL-enabled sites include:
- `X-Frame-Options: SAMEORIGIN` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `X-Content-Type-Options: nosniff` - MIME sniffing protection
- `Strict-Transport-Security` - HSTS header

---

## Certificate Renewal

### Automatic Renewal
Certbot automatically configures renewal via systemd timer:
- Checks twice daily for expiring certificates
- Renews certificates 30 days before expiry
- No manual intervention required

### Manual Renewal
```bash
# Dry run (test renewal)
certbot renew --dry-run

# Force renewal
certbot renew --force-renewal

# Renew specific certificate
certbot renew --cert-name subdomain.domain.com
```

### Verify Renewal Timer
```bash
# Check timer status
systemctl status certbot.timer

# View renewal logs
journalctl -u certbot.renew
```

---

## Backup and Rollback

### Automatic Backups
All SSL functions create automatic backups:
- Backup created before SSL installation
- Backup format: `config.backup.pre-ssl.YYYYMMDD_HHMMSS`
- Stored in `/etc/nginx/sites-available/`

### Manual Rollback
```bash
# List backups
ls -la /etc/nginx/sites-available/*.backup*

# Restore from backup
cp /etc/nginx/sites-available/subdomain.backup.YYYYMMDD_HHMMSS \
   /etc/nginx/sites-available/subdomain

# Test and reload
nginx -t && systemctl reload nginx
```

---

## Testing

### Run SSL Management Tests
```bash
bash /path/to/test_ssl_management.sh
```

### Manual Testing
```bash
# Test HTTPS connection
curl -I https://subdomain.domain.com

# Test SSL certificate
openssl s_client -connect subdomain.domain.com:443 -servername subdomain.domain.com

# Test HTTP redirect
curl -I http://subdomain.domain.com
```

---

## Integration Examples

### Complete Subdomain Setup with SSL
```bash
#!/bin/bash
source /path/to/common.sh

SUBDOMAIN="api.openplp.org"
PORT="3000"
EMAIL="admin@example.com"

# Check root privileges
check_root

# Install dependencies
install_dependencies

# Create nginx configuration
create_nginx_config "$SUBDOMAIN" "127.0.0.1" "$PORT" "http"

# Enable site
enable_site_and_reload "$SUBDOMAIN"

# Install SSL
if install_ssl_safe "$SUBDOMAIN" "$EMAIL"; then
    print_success "Subdomain setup complete with SSL"
    print_info "Access your site at: https://$SUBDOMAIN"
else
    print_warning "Subdomain setup complete without SSL"
    print_info "Access your site at: http://$SUBDOMAIN"
fi
```

### SSL Status Check Script
```bash
#!/bin/bash
source /path/to/common.sh

echo "SSL Certificate Status Report"
echo "=============================="
echo

# List all certificates
list_certificates

echo
echo "Checking individual subdomains:"
echo "-------------------------------"

# Check each configured subdomain
for subdomain in $(list_configured_sites); do
    echo -n "$subdomain: "
    if is_ssl_configured "$subdomain"; then
        echo "SSL Configured ✓"
    else
        echo "No SSL"
    fi
done
```

---

## Troubleshooting

### Debug Mode
Enable verbose output for troubleshooting:
```bash
set -x  # Enable debug mode
install_ssl "subdomain.domain.com" "admin@example.com"
set +x  # Disable debug mode
```

### Check Certbot Logs
```bash
# View certbot logs
tail -f /var/log/letsencrypt/letsencrypt.log

# Check nginx error logs
tail -f /var/log/nginx/error.log
```

### Verify Configuration
```bash
# Test nginx configuration
nginx -t

# Check SSL certificate files
ls -la /etc/letsencrypt/live/subdomain.domain.com/

# Verify certificate details
certbot certificates -d subdomain.domain.com
```

---

## Best Practices

1. **Always use valid email addresses** - Required for renewal notifications
2. **Wait for DNS propagation** - Don't rush SSL installation
3. **Test in staging first** - Use `--staging` flag for testing
4. **Monitor certificate expiry** - Check `certbot certificates` regularly
5. **Keep backups** - Don't delete automatic backups
6. **Use HSTS carefully** - Once enabled, browsers cache for 1 year
7. **Test after installation** - Verify HTTPS works before announcing
8. **Monitor renewal** - Check `systemctl status certbot.timer`

---

## References

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [HSTS Specification](https://tools.ietf.org/html/rfc6797)
