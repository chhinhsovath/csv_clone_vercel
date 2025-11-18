# Complete Subdomain Setup Package
## For openplp.org on VPS 157.10.73.52

Created by: Sovath.C
Date: 2025

---

## 📦 Package Contents

1. **setup-subdomain.sh** - Full interactive setup wizard
2. **quick-subdomain.sh** - Fast command-line setup
3. **manage-subdomains.sh** - Management interface for existing subdomains
4. **README.md** - Comprehensive documentation
5. **install.sh** - Installation helper

---

## 🚀 Quick Start

### Step 1: Upload Scripts to Your VPS

```bash
# Connect to your VPS
ssh root@157.10.73.52

# Create directory
mkdir -p ~/subdomain-tools
cd ~/subdomain-tools

# Upload all .sh files to this directory
# (Use SCP, SFTP, or copy-paste)
```

### Step 2: Make Scripts Executable

```bash
chmod +x *.sh
```

### Step 3: Choose Your Setup Method

#### Method A: Interactive Setup (Recommended for First Time)
```bash
sudo ./setup-subdomain.sh
```
This will guide you through all options with prompts.

#### Method B: Quick Setup (For Experienced Users)
```bash
# Usage: sudo ./quick-subdomain.sh <subdomain> <port> [email]
sudo ./quick-subdomain.sh webadmin.openplp.org 10000 your@email.com
sudo ./quick-subdomain.sh api.openplp.org 3000 your@email.com
```

#### Method C: Management Interface (For Existing Subdomains)
```bash
sudo ./manage-subdomains.sh
```

---

## 📝 Your First Subdomain Setup

Let's set up your Webmin panel:

### On Your VPS:

```bash
cd ~/subdomain-tools
sudo ./setup-subdomain.sh
```

**Follow the prompts:**
- Subdomain: `webadmin.openplp.org`
- Protocol: `2` (HTTPS)
- Host: `127.0.0.1` (press Enter)
- Port: `10000`
- Install SSL: `y`
- Email: `your@email.com`
- Basic Auth: `n` (or `y` if you want extra security)

### In Cloudflare:

1. Go to https://dash.cloudflare.com
2. Select `openplp.org`
3. Click **DNS** tab
4. Click **Add record**
5. Fill in:
   - Type: `A`
   - Name: `webadmin`
   - IPv4 address: `157.10.73.52`
   - Proxy status: **DNS only** (Gray cloud) ⚠️ Important!
   - TTL: Auto
6. Click **Save**

### Wait & Access:

- Wait 5-10 minutes for DNS propagation
- Check at: https://dnschecker.org
- Access: https://webadmin.openplp.org

---

## 🎯 Common Scenarios

### Scenario 1: Next.js Application on Port 3000

**VPS:**
```bash
sudo ./quick-subdomain.sh app.openplp.org 3000 your@email.com
```

**Cloudflare:**
- Name: `app`
- IPv4: `157.10.73.52`
- Proxy: DNS Only

### Scenario 2: Node.js API on Port 8080

**VPS:**
```bash
sudo ./quick-subdomain.sh api.openplp.org 8080 your@email.com
```

**Cloudflare:**
- Name: `api`
- IPv4: `157.10.73.52`
- Proxy: DNS Only

### Scenario 3: PostgreSQL Admin (pgAdmin) on Port 5050

**VPS:**
```bash
sudo ./setup-subdomain.sh
# Select: pgadmin.openplp.org, port 5050, with authentication
```

**Cloudflare:**
- Name: `pgadmin`
- IPv4: `157.10.73.52`
- Proxy: DNS Only

### Scenario 4: MongoDB Express on Port 8081

**VPS:**
```bash
sudo ./quick-subdomain.sh mongo.openplp.org 8081 your@email.com
```

**Cloudflare:**
- Name: `mongo`
- IPv4: `157.10.73.52`
- Proxy: DNS Only

---

## 🛠️ Management Commands

### List All Subdomains
```bash
sudo ./manage-subdomains.sh
# Select option 1
```

### View Logs
```bash
# Real-time error log
sudo tail -f /var/log/nginx/webadmin.openplp.org_error.log

# Real-time access log
sudo tail -f /var/log/nginx/webadmin.openplp.org_access.log
```

### Edit Configuration
```bash
sudo nano /etc/nginx/sites-available/webadmin.openplp.org
sudo nginx -t
sudo systemctl reload nginx
```

### Enable/Disable Subdomain
```bash
sudo ./manage-subdomains.sh
# Select option 3 or 4
```

### Remove Subdomain
```bash
sudo ./manage-subdomains.sh
# Select option 6
```

---

## 🔒 Security Best Practices

### 1. Always Use SSL
```bash
# Already included in setup scripts
sudo certbot --nginx -d your-subdomain.openplp.org
```

### 2. Enable Basic Authentication for Admin Panels
```bash
# During setup, select "y" for basic authentication
# Or manually:
sudo htpasswd -c /etc/nginx/.htpasswd_subdomain username
```

### 3. Configure Firewall
```bash
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 4. Regular Updates
```bash
sudo apt update && sudo apt upgrade -y
sudo certbot renew
```

### 5. Monitor Logs
```bash
# Setup log rotation
sudo nano /etc/logrotate.d/nginx
```

---

## 🐛 Troubleshooting

### Problem: Cannot access subdomain

**Solution:**
```bash
# Check DNS
dig webadmin.openplp.org

# Check Nginx
sudo systemctl status nginx
sudo nginx -t

# Check service is running
sudo netstat -tuln | grep :10000
```

### Problem: SSL Certificate Failed

**Solution:**
```bash
# Make sure port 80 is open
sudo ufw allow 80

# Try manual installation
sudo certbot --nginx -d webadmin.openplp.org

# Check logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### Problem: 502 Bad Gateway

**Solution:**
```bash
# Check if service is running
sudo systemctl status webmin  # or your service

# Check if port is listening
sudo ss -tuln | grep :10000

# Check Nginx error log
sudo tail -f /var/log/nginx/webadmin.openplp.org_error.log
```

### Problem: 403 Forbidden

**Solution:**
```bash
# Check file permissions
ls -la /path/to/your/app

# Check Nginx user
ps aux | grep nginx

# Adjust permissions if needed
sudo chown -R www-data:www-data /path/to/your/app
```

---

## 📊 Monitoring Your Subdomains

### Check All Active Subdomains
```bash
sudo ./manage-subdomains.sh
# Select option 1
```

### SSL Certificate Status
```bash
sudo certbot certificates
```

### Nginx Status
```bash
sudo systemctl status nginx
```

### Real-time Monitoring
```bash
# Install monitoring tools
sudo apt install htop nethogs

# Monitor system resources
htop

# Monitor network usage
sudo nethogs
```

---

## 🔄 Automation Tips

### Auto-renewal for SSL Certificates
```bash
# Already configured by Certbot
# Test renewal
sudo certbot renew --dry-run

# Check cron job
sudo cat /etc/cron.d/certbot
```

### Backup Configurations
```bash
# Backup all Nginx configs
sudo tar -czf nginx-backup-$(date +%Y%m%d).tar.gz /etc/nginx/

# Backup to remote server
scp nginx-backup-*.tar.gz user@backup-server:/backups/
```

### Monitoring Script
```bash
# Create monitoring script
cat > /root/check-subdomains.sh << 'EOF'
#!/bin/bash
for subdomain in webadmin.openplp.org api.openplp.org; do
    if ! curl -s --max-time 5 https://$subdomain > /dev/null; then
        echo "⚠️  $subdomain is DOWN" | mail -s "Alert: $subdomain down" your@email.com
    fi
done
EOF

chmod +x /root/check-subdomains.sh

# Add to crontab (run every 5 minutes)
(crontab -l; echo "*/5 * * * * /root/check-subdomains.sh") | crontab -
```

---

## 📚 Additional Resources

### Official Documentation
- Nginx: https://nginx.org/en/docs/
- Certbot: https://certbot.eff.org/
- Cloudflare DNS: https://developers.cloudflare.com/dns/

### Useful Commands Reference

**Nginx:**
```bash
sudo nginx -t                    # Test configuration
sudo systemctl status nginx      # Check status
sudo systemctl reload nginx      # Reload config
sudo systemctl restart nginx     # Restart service
```

**SSL/Certbot:**
```bash
sudo certbot certificates        # List certificates
sudo certbot renew              # Renew all certificates
sudo certbot delete             # Remove certificate
```

**System:**
```bash
sudo systemctl status SERVICE    # Check service status
sudo journalctl -u nginx -f     # View Nginx journal
sudo tail -f /var/log/nginx/*   # Monitor all logs
```

---

## 💡 Pro Tips

1. **Use meaningful subdomain names:**
   - `api.openplp.org` for APIs
   - `admin.openplp.org` for admin panels
   - `dev.openplp.org` for development
   - `staging.openplp.org` for staging

2. **Keep development and production separate:**
   - `app.openplp.org` (production)
   - `dev-app.openplp.org` (development)

3. **Document your setup:**
   - Keep a list of all subdomains
   - Note which ports they use
   - Track SSL expiry dates

4. **Regular maintenance:**
   - Update server monthly: `sudo apt update && sudo apt upgrade`
   - Check logs weekly
   - Test backups quarterly

5. **Security checklist:**
   - ✅ SSL enabled for all subdomains
   - ✅ Basic auth for admin panels
   - ✅ Firewall configured
   - ✅ Regular updates scheduled
   - ✅ Strong passwords used
   - ✅ Logs monitored

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section
2. Review error logs: `sudo tail -f /var/log/nginx/*_error.log`
3. Test Nginx config: `sudo nginx -t`
4. Check service status: `sudo systemctl status SERVICE_NAME`

---

## 🎓 Learning Path

**Beginner:**
1. Set up one subdomain using `setup-subdomain.sh`
2. Learn to read logs
3. Practice enabling/disabling subdomains

**Intermediate:**
1. Use `quick-subdomain.sh` for faster setup
2. Configure custom Nginx settings
3. Set up monitoring

**Advanced:**
1. Create custom Nginx configurations
2. Implement load balancing
3. Set up CI/CD pipelines with subdomain automation

---

## ✅ Checklist for Production

Before going live:

- [ ] DNS configured in Cloudflare
- [ ] SSL certificate installed and working
- [ ] Service running on target port
- [ ] Firewall rules configured
- [ ] Basic authentication enabled (for admin panels)
- [ ] Logs being monitored
- [ ] Backup strategy in place
- [ ] Auto-renewal for SSL tested
- [ ] Error pages configured
- [ ] Performance tested

---

## 📝 Version History

- v1.0 (2025) - Initial release
  - Full setup script with interactive wizard
  - Quick setup for command-line usage
  - Management interface
  - Comprehensive documentation

---

## 🙏 Credits

Developed by Sovath.C for Educational Technology Projects
Cambodia Ministry of Education, Youth and Sports

---

**Happy Subdomain Management! 🚀**
