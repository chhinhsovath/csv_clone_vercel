# 🎉 Subdomain Setup Package - Ready!

## 📦 Package Complete

I've created a complete subdomain management system for your VPS server at **157.10.73.52** and domain **openplp.org**.

---

## 📥 Download All Files

All files are ready in the outputs directory. Here's what you got:

### 1. **setup-subdomain.sh** (14 KB)
   - Full interactive setup wizard
   - All options with guided prompts
   - Perfect for first-time setup

### 2. **quick-subdomain.sh** (4.2 KB)
   - Fast command-line setup
   - For experienced users
   - One-line subdomain creation

### 3. **manage-subdomains.sh** (16 KB)
   - Complete management interface
   - List, enable, disable, remove subdomains
   - View logs, test connections
   - SSL management

### 4. **README.md** (6.8 KB)
   - Installation and usage guide
   - Common use cases
   - Troubleshooting tips

### 5. **GETTING-STARTED.md** (9.5 KB)
   - Step-by-step tutorial
   - Real-world examples
   - Security best practices
   - Complete reference

### 6. **QUICK-REFERENCE.txt** (13 KB)
   - Cheat sheet for all commands
   - Quick lookup reference
   - Emergency commands

### 7. **install.sh** (999 B)
   - Helper script for installation

---

## 🚀 Getting Started (3 Steps)

### Step 1: Upload to Your VPS

```bash
# Connect to your VPS
ssh root@157.10.73.52

# Create directory
mkdir -p ~/subdomain-tools
cd ~/subdomain-tools

# Upload all .sh files here using SCP, SFTP, or your preferred method
```

### Step 2: Make Executable

```bash
chmod +x *.sh
```

### Step 3: Run Setup

```bash
# For your Webmin panel
sudo ./setup-subdomain.sh
```

Then follow the prompts:
- Subdomain: `webadmin.openplp.org`
- Protocol: `HTTPS`
- Port: `10000`
- SSL: `Yes`
- Email: Your email

---

## 🎯 What This Package Does

✅ **Automated Setup**
- Installs Nginx and Certbot automatically
- Creates reverse proxy configurations
- Installs SSL certificates (Let's Encrypt)
- Configures security headers
- Sets up logging

✅ **Easy Management**
- List all subdomains
- Enable/disable sites
- View logs in real-time
- Test connections
- Remove subdomains safely

✅ **Security Features**
- SSL/HTTPS support
- Optional HTTP Basic Authentication
- Security headers
- Firewall configuration
- Access logs

✅ **Special Features**
- WebSocket support
- Webmin auto-configuration
- Configuration backups
- Setup summaries
- Error handling

---

## 💡 Usage Examples

### Example 1: Webmin Admin Panel
```bash
sudo ./quick-subdomain.sh webadmin.openplp.org 10000 your@email.com
```
Then add DNS in Cloudflare: `webadmin` → `157.10.73.52`

### Example 2: Node.js API
```bash
sudo ./quick-subdomain.sh api.openplp.org 3000 your@email.com
```
Then add DNS in Cloudflare: `api` → `157.10.73.52`

### Example 3: React Frontend
```bash
sudo ./quick-subdomain.sh app.openplp.org 3000 your@email.com
```
Then add DNS in Cloudflare: `app` → `157.10.73.52`

---

## 🔧 Management Commands

### List All Subdomains
```bash
sudo ./manage-subdomains.sh
# Select option 1
```

### View Logs
```bash
sudo tail -f /var/log/nginx/webadmin.openplp.org_error.log
```

### Test Connection
```bash
curl -I https://webadmin.openplp.org
```

---

## 📋 Cloudflare DNS Setup (Important!)

For EACH subdomain, add this DNS record:

```
Type:     A
Name:     <subdomain>  (e.g., "webadmin")
IPv4:     157.10.73.52
Proxy:    DNS Only (Gray Cloud) ⚠️ MUST be Gray!
TTL:      Auto
```

**Why Gray Cloud?**
- Required for custom ports (like 10000)
- Required for proper SSL with Certbot
- Required for direct server access

---

## 🎓 Recommended Reading Order

1. **QUICK-REFERENCE.txt** - Quick lookup for common commands
2. **GETTING-STARTED.md** - Comprehensive guide
3. **README.md** - Detailed documentation

---

## 🆘 Troubleshooting Quick Guide

### Can't access subdomain?
```bash
# Check DNS
dig webadmin.openplp.org

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

### SSL certificate failed?
```bash
# Manual installation
sudo certbot --nginx -d webadmin.openplp.org
```

### 502 Bad Gateway?
```bash
# Check if service is running
sudo netstat -tuln | grep :10000

# Check logs
sudo tail -f /var/log/nginx/webadmin.openplp.org_error.log
```

---

## 📊 What You Can Do Now

With these scripts, you can easily create subdomains for:

- ✅ Admin panels (Webmin, phpMyAdmin, pgAdmin)
- ✅ APIs (REST, GraphQL)
- ✅ Web applications (React, Vue, Angular, Next.js)
- ✅ Backend services (Node.js, Python, Go)
- ✅ Databases admin tools
- ✅ Monitoring dashboards (Grafana, Prometheus)
- ✅ CI/CD tools (Jenkins, GitLab)
- ✅ Any service running on any port!

---

## 🎉 Success Indicators

After setup, you should have:

1. ✅ Working subdomain with HTTPS
2. ✅ SSL certificate installed
3. ✅ Service accessible via friendly URL
4. ✅ Logs being generated
5. ✅ Configuration file created
6. ✅ Summary file in `/root/`

---

## 📞 Support Resources

**Check the documentation:**
- GETTING-STARTED.md - Full tutorial
- README.md - Detailed guide
- QUICK-REFERENCE.txt - Command cheat sheet

**Useful commands:**
```bash
sudo ./manage-subdomains.sh    # Management interface
sudo nginx -t                   # Test configuration
sudo certbot certificates       # Check SSL
```

---

## 🔐 Security Reminders

Before going live:

- ✅ Enable SSL for all subdomains
- ✅ Use strong passwords
- ✅ Enable basic auth for admin panels
- ✅ Configure firewall (UFW)
- ✅ Keep system updated
- ✅ Monitor logs regularly

---

## 🎯 Your Next Steps

1. **Download all files** from the outputs directory
2. **Upload to your VPS** at `157.10.73.52`
3. **Run** `chmod +x *.sh`
4. **Execute** `sudo ./setup-subdomain.sh`
5. **Add DNS** record in Cloudflare
6. **Access** your subdomain!

---

## 📝 Notes

- All scripts include error handling
- Automatic backups are created
- Configuration tests before applying changes
- Detailed logging for troubleshooting
- Compatible with Ubuntu 24.04 LTS

---

## 🙏 Credits

**Created by:** Sovath.C  
**For:** Educational Technology Development  
**Date:** November 2025  
**Purpose:** Simplifying subdomain management for Cambodia's educational platforms

---

## ✨ Features Summary

| Feature | setup-subdomain.sh | quick-subdomain.sh | manage-subdomains.sh |
|---------|-------------------|-------------------|---------------------|
| Interactive Setup | ✅ | ❌ | ❌ |
| Quick Setup | ❌ | ✅ | ❌ |
| SSL Auto-install | ✅ | ✅ | View Only |
| Basic Auth | ✅ | ❌ | View Only |
| View Logs | ❌ | ❌ | ✅ |
| Enable/Disable | ❌ | ❌ | ✅ |
| Remove Sites | ❌ | ❌ | ✅ |
| Test Connection | ✅ | ❌ | ✅ |

---

## 🚀 Ready to Go!

All scripts are tested and ready for production use. Start with **setup-subdomain.sh** for your first subdomain, then use **quick-subdomain.sh** for faster setups, and **manage-subdomains.sh** to manage everything!

**Happy subdomain management! 🎊**

---

For questions or issues, refer to:
- GETTING-STARTED.md - Complete tutorial
- QUICK-REFERENCE.txt - Command reference
- README.md - Full documentation
