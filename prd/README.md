# Subdomain Setup Script - Installation & Usage Guide

## Quick Start

### 1. Download the script to your VPS
```bash
# Upload the script to your server, then:
chmod +x setup-subdomain.sh
```

### 2. Run the script
```bash
sudo ./setup-subdomain.sh
```

### 3. Follow the prompts
The script will ask you for:
- Subdomain name (e.g., api.openplp.org)
- Target protocol (HTTP/HTTPS)
- Target host (default: 127.0.0.1)
- Target port (e.g., 10000, 3000, 8080)
- SSL installation (yes/no)
- Email for SSL certificate
- Basic authentication (optional)

## Features

✅ **Automated Setup**
- Installs Nginx and Certbot automatically
- Creates reverse proxy configuration
- Enables SSL with Let's Encrypt
- Configures security headers
- Sets up logging

✅ **Security**
- Optional HTTP Basic Authentication
- SSL/HTTPS support
- Security headers (X-Frame-Options, X-XSS-Protection, etc.)
- Firewall configuration (UFW)

✅ **Special Features**
- WebSocket support
- Automatic Webmin referer configuration
- Configuration testing
- Detailed logging
- Setup summary file

## Usage Examples

### Example 1: Webmin on port 10000
```
Subdomain: webadmin.openplp.org
Protocol: HTTPS
Host: 127.0.0.1
Port: 10000
SSL: Yes
Email: your@email.com
```

### Example 2: Node.js API on port 3000
```
Subdomain: api.openplp.org
Protocol: HTTP
Host: 127.0.0.1
Port: 3000
SSL: Yes
Email: your@email.com
```

### Example 3: Docker container on port 8080
```
Subdomain: app.openplp.org
Protocol: HTTP
Host: 127.0.0.1
Port: 8080
SSL: Yes
Email: your@email.com
Auth: Yes
```

## After Running the Script

### 1. Add DNS Record in Cloudflare
- Go to Cloudflare Dashboard
- Select your domain (openplp.org)
- Go to DNS tab
- Add A record:
  - Type: `A`
  - Name: `subdomain-name` (e.g., `webadmin`)
  - IPv4 address: `157.10.73.52`
  - Proxy status: **DNS Only (Gray Cloud)** ⚠️ Important!
  - TTL: Auto

### 2. Wait for DNS Propagation
- Usually takes 5-10 minutes
- Check at: https://dnschecker.org

### 3. Access Your Subdomain
- HTTP: http://subdomain.openplp.org
- HTTPS: https://subdomain.openplp.org

## Common Use Cases

### Web Applications
- Frontend apps (React, Vue, Angular)
- Backend APIs (Node.js, Python, Go)
- Admin panels (Webmin, phpMyAdmin)
- Monitoring tools (Grafana, Prometheus)

### Services
- Database admin (pgAdmin, Adminer)
- CI/CD (Jenkins, GitLab)
- Project management (Jira, Redmine)
- Chat applications (Mattermost, Rocket.Chat)

### Docker Containers
Any containerized application running on a port

## File Locations

### Configuration Files
```
/etc/nginx/sites-available/your-subdomain
/etc/nginx/sites-enabled/your-subdomain
/etc/nginx/.htpasswd_your-subdomain (if auth enabled)
```

### Log Files
```
/var/log/nginx/your-subdomain_access.log
/var/log/nginx/your-subdomain_error.log
```

### Summary Files
```
/root/subdomain-setup-your-subdomain.txt
```

## Useful Commands

### View Nginx Logs
```bash
# Real-time error log
sudo tail -f /var/log/nginx/your-subdomain_error.log

# Real-time access log
sudo tail -f /var/log/nginx/your-subdomain_access.log

# Last 100 lines
sudo tail -n 100 /var/log/nginx/your-subdomain_error.log
```

### Test & Reload Nginx
```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx
```

### SSL Certificate Management
```bash
# Renew all certificates
sudo certbot renew

# Renew specific certificate
sudo certbot renew --cert-name your-subdomain

# Test renewal (dry run)
sudo certbot renew --dry-run

# List certificates
sudo certbot certificates

# Delete certificate
sudo certbot delete --cert-name your-subdomain
```

### Edit Configuration
```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/your-subdomain

# After editing, test and reload
sudo nginx -t && sudo systemctl reload nginx
```

## Removing a Subdomain

```bash
# 1. Disable site
sudo rm /etc/nginx/sites-enabled/your-subdomain

# 2. Remove configuration
sudo rm /etc/nginx/sites-available/your-subdomain

# 3. Remove auth file (if exists)
sudo rm /etc/nginx/.htpasswd_your-subdomain

# 4. Reload Nginx
sudo systemctl reload nginx

# 5. Remove SSL certificate (optional)
sudo certbot delete --cert-name your-subdomain

# 6. Remove DNS record from Cloudflare
```

## Troubleshooting

### 502 Bad Gateway
- Check if target service is running
- Verify port number is correct
- Check firewall rules: `sudo ufw status`

### SSL Certificate Failed
- Ensure DNS is properly configured
- Make sure port 80 and 443 are open
- Check domain is accessible: `curl -I http://your-subdomain`
- Try manual installation: `sudo certbot --nginx -d your-subdomain`

### 403 Forbidden
- Check file permissions
- Verify Nginx user has access
- Check SELinux if enabled: `sudo getenforce`

### Cannot Connect
- Verify DNS propagation: `dig your-subdomain`
- Check Nginx is running: `sudo systemctl status nginx`
- Check firewall: `sudo ufw status`
- Test port locally: `curl localhost:PORT`

### Check DNS Resolution
```bash
# Using dig
dig your-subdomain.openplp.org

# Using nslookup
nslookup your-subdomain.openplp.org

# Using host
host your-subdomain.openplp.org
```

### Test Connection
```bash
# Test HTTP
curl -I http://your-subdomain.openplp.org

# Test HTTPS
curl -I https://your-subdomain.openplp.org

# Test with authentication
curl -u username:password https://your-subdomain.openplp.org
```

## Security Best Practices

1. **Always use HTTPS** for production sites
2. **Enable basic auth** for admin panels
3. **Regular updates**: `sudo apt update && sudo apt upgrade`
4. **Monitor logs** for suspicious activity
5. **Use strong passwords** for authentication
6. **Keep SSL certificates updated** (auto-renewal with Certbot)
7. **Restrict access** with firewall rules if needed
8. **Use Cloudflare proxy** for DDoS protection (some services)

## Performance Tips

1. **Enable Gzip compression** in Nginx
2. **Configure caching** for static content
3. **Adjust buffer sizes** based on your application
4. **Monitor resource usage**: `htop`
5. **Set appropriate timeout values**

## Advanced Configuration

### Add Custom Headers
Edit `/etc/nginx/sites-available/your-subdomain`:
```nginx
add_header Custom-Header "Value" always;
```

### Configure Rate Limiting
```nginx
limit_req_zone $binary_remote_addr zone=mylimit:10m rate=10r/s;

server {
    location / {
        limit_req zone=mylimit burst=20 nodelay;
        ...
    }
}
```

### IP Whitelist
```nginx
location / {
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    deny all;
    ...
}
```

## Getting Help

If you encounter issues:
1. Check the setup summary file
2. Review Nginx error logs
3. Test Nginx configuration: `sudo nginx -t`
4. Verify DNS: `dig your-subdomain`
5. Check service status: `sudo systemctl status nginx`

## Credits

Script by: Sovath.C
For: Educational Technology Development
Cambodia Ministry of Education, Youth and Sports
