# Requirements Document

## Introduction

This document specifies the requirements for a Subdomain Management System designed to automate the creation, configuration, and management of subdomains on a VPS server (157.10.73.52) with the domain openplp.org. The system provides three main components: an interactive setup wizard, a quick command-line tool, and a management interface for existing subdomains. The system automates Nginx reverse proxy configuration, SSL certificate installation via Let's Encrypt, and integrates with Cloudflare DNS.

## Glossary

- **System**: The Subdomain Management System consisting of three bash scripts (setup-subdomain.sh, quick-subdomain.sh, manage-subdomains.sh)
- **VPS**: Virtual Private Server at IP address 157.10.73.52
- **Nginx**: Web server and reverse proxy software
- **Certbot**: Let's Encrypt SSL certificate management tool
- **Subdomain**: A domain prefix under openplp.org (e.g., api.openplp.org)
- **Reverse Proxy**: Nginx configuration that forwards requests to backend services
- **SSL Certificate**: HTTPS encryption certificate from Let's Encrypt
- **Target Service**: The backend application running on a specific port
- **Configuration File**: Nginx site configuration stored in /etc/nginx/sites-available/
- **PM2**: Process manager for Node.js applications
- **WebSocket**: Protocol for bidirectional communication requiring special proxy configuration

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want to set up new subdomains with an interactive wizard, so that I can configure all options with guided prompts.

#### Acceptance Criteria

1. WHEN the administrator executes setup-subdomain.sh with root privileges, THE System SHALL display an interactive configuration wizard
2. WHEN the administrator provides a subdomain name, THE System SHALL validate the domain format against standard DNS naming conventions
3. WHEN the administrator specifies a target port, THE System SHALL validate that the port number is between 1 and 65535
4. WHEN the administrator confirms the configuration, THE System SHALL create an Nginx reverse proxy configuration file at /etc/nginx/sites-available/[subdomain]
5. WHEN the Nginx configuration is created, THE System SHALL enable the site by creating a symbolic link in /etc/nginx/sites-enabled/

### Requirement 2

**User Story:** As a developer, I want to quickly create subdomains via command-line, so that I can automate subdomain creation without interactive prompts.

#### Acceptance Criteria

1. WHEN the developer executes quick-subdomain.sh with subdomain and port arguments, THE System SHALL create the subdomain configuration without interactive prompts
2. WHEN the developer provides fewer than two arguments, THE System SHALL display usage instructions and exit with an error code
3. WHEN the target port is not listening, THE System SHALL display an error message and halt execution
4. WHEN the configuration is successfully created, THE System SHALL reload Nginx within 5 seconds
5. WHERE the target port is 10000, THE System SHALL automatically configure Webmin referer settings

### Requirement 3

**User Story:** As a system administrator, I want to install SSL certificates automatically, so that all subdomains are secured with HTTPS.

#### Acceptance Criteria

1. WHEN the administrator confirms SSL installation during setup, THE System SHALL execute Certbot with the nginx plugin for the specified subdomain
2. WHEN Certbot successfully obtains a certificate, THE System SHALL update the Nginx configuration to listen on port 443
3. WHEN SSL installation fails, THE System SHALL log the error and continue with HTTP-only configuration
4. WHEN a certificate is installed, THE System SHALL configure automatic HTTP to HTTPS redirection
5. THE System SHALL configure Certbot automatic renewal via systemd timer

### Requirement 4

**User Story:** As a system administrator, I want to manage existing subdomains, so that I can view, enable, disable, or remove subdomain configurations.

#### Acceptance Criteria

1. WHEN the administrator executes manage-subdomains.sh, THE System SHALL display a menu with management options
2. WHEN the administrator selects the list option, THE System SHALL display all subdomain configurations with their status (enabled/disabled), SSL status, and target information
3. WHEN the administrator selects the enable option, THE System SHALL create a symbolic link in sites-enabled and reload Nginx
4. WHEN the administrator selects the disable option, THE System SHALL remove the symbolic link from sites-enabled and reload Nginx
5. WHEN the administrator selects the remove option, THE System SHALL delete the configuration file, remove the symbolic link, and optionally delete the SSL certificate

### Requirement 5

**User Story:** As a system administrator, I want the system to automatically install required dependencies, so that I don't need to manually install Nginx and Certbot.

#### Acceptance Criteria

1. WHEN the System detects that Nginx is not installed, THE System SHALL install Nginx via apt package manager
2. WHEN the System detects that Certbot is not installed, THE System SHALL install Certbot and python3-certbot-nginx via apt package manager
3. WHEN dependencies are installed, THE System SHALL enable and start the Nginx service
4. WHEN the System runs without root privileges, THE System SHALL display an error message and exit
5. THE System SHALL verify successful installation by checking command availability before proceeding

### Requirement 6

**User Story:** As a developer, I want WebSocket support in reverse proxy configurations, so that real-time applications function correctly.

#### Acceptance Criteria

1. THE System SHALL include Upgrade and Connection headers in all Nginx proxy configurations
2. THE System SHALL set proxy_http_version to 1.1 for WebSocket compatibility
3. THE System SHALL configure proxy timeout values of at least 60 seconds
4. THE System SHALL pass X-Real-IP and X-Forwarded-For headers to backend services
5. THE System SHALL configure proxy_set_header Host to preserve the original host header

### Requirement 7

**User Story:** As a system administrator, I want to view logs for specific subdomains, so that I can troubleshoot issues.

#### Acceptance Criteria

1. WHEN a subdomain is created, THE System SHALL configure separate access and error log files at /var/log/nginx/[subdomain]_access.log and /var/log/nginx/[subdomain]_error.log
2. WHEN the administrator selects the view logs option in manage-subdomains.sh, THE System SHALL display the last 50 lines of the error log
3. WHEN the administrator requests real-time logs, THE System SHALL execute tail -f on the specified log file
4. THE System SHALL create log files with appropriate permissions for the Nginx user
5. THE System SHALL rotate logs according to the system logrotate configuration

### Requirement 8

**User Story:** As a system administrator, I want optional HTTP Basic Authentication, so that I can protect admin panels and sensitive services.

#### Acceptance Criteria

1. WHEN the administrator enables basic authentication during setup, THE System SHALL prompt for a username and password
2. WHEN credentials are provided, THE System SHALL create an htpasswd file at /etc/nginx/.htpasswd_[subdomain]
3. WHEN the htpasswd file is created, THE System SHALL add auth_basic directives to the Nginx configuration
4. WHEN authentication is enabled, THE System SHALL hash passwords using bcrypt algorithm
5. THE System SHALL set file permissions on htpasswd files to 640 with root ownership

### Requirement 9

**User Story:** As a system administrator, I want configuration validation before applying changes, so that invalid configurations don't break Nginx.

#### Acceptance Criteria

1. WHEN the System creates or modifies an Nginx configuration, THE System SHALL execute nginx -t to validate syntax
2. WHEN nginx -t reports errors, THE System SHALL display the error message and halt execution
3. WHEN nginx -t succeeds, THE System SHALL reload Nginx using systemctl reload nginx
4. WHEN Nginx reload fails, THE System SHALL restore the previous configuration from backup
5. THE System SHALL create configuration backups before making changes

### Requirement 10

**User Story:** As a system administrator, I want a setup summary file, so that I have a record of the configuration details.

#### Acceptance Criteria

1. WHEN a subdomain setup completes successfully, THE System SHALL create a summary file at /root/subdomain-setup-[subdomain].txt
2. WHEN the summary file is created, THE System SHALL include subdomain name, target host and port, SSL status, and configuration file paths
3. WHEN authentication is enabled, THE System SHALL include the htpasswd file path in the summary
4. WHEN the summary file is created, THE System SHALL set file permissions to 600 with root ownership
5. THE System SHALL append a timestamp to the summary file

### Requirement 11

**User Story:** As a system administrator, I want security headers configured automatically, so that subdomains follow security best practices.

#### Acceptance Criteria

1. THE System SHALL add X-Frame-Options header with value SAMEORIGIN to all configurations
2. THE System SHALL add X-XSS-Protection header with value "1; mode=block" to all configurations
3. THE System SHALL add X-Content-Type-Options header with value nosniff to all configurations
4. WHERE SSL is enabled, THE System SHALL add Strict-Transport-Security header with max-age of 31536000 seconds
5. THE System SHALL configure security headers to apply to all response types

### Requirement 12

**User Story:** As a system administrator, I want to test subdomain connectivity, so that I can verify the configuration is working.

#### Acceptance Criteria

1. WHEN the administrator selects the test connection option, THE System SHALL execute curl with the -I flag against the subdomain URL
2. WHEN the connection test succeeds, THE System SHALL display HTTP response headers
3. WHEN the connection test fails, THE System SHALL display the error message and suggest troubleshooting steps
4. WHEN testing HTTPS connections, THE System SHALL verify SSL certificate validity
5. THE System SHALL test both HTTP and HTTPS endpoints when SSL is enabled
