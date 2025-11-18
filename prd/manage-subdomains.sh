#!/bin/bash

################################################################################
# Subdomain Management Script
# Author: Sovath.C
# Description: Manage existing subdomains (list, enable, disable, remove)
# Usage: sudo ./manage-subdomains.sh
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_header() {
    echo -e "${CYAN}$1${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "Please run this script as root or with sudo"
        exit 1
    fi
}

list_subdomains() {
    print_header "=== Available Subdomains ==="
    echo ""
    
    if [ ! -d "/etc/nginx/sites-available" ]; then
        print_error "Nginx sites-available directory not found"
        return 1
    fi
    
    local count=0
    for site in /etc/nginx/sites-available/*; do
        if [ -f "$site" ] && [ "$(basename "$site")" != "default" ]; then
            count=$((count + 1))
            local sitename=$(basename "$site")
            local enabled="❌ Disabled"
            
            if [ -L "/etc/nginx/sites-enabled/$sitename" ]; then
                enabled="✅ Enabled"
            fi
            
            # Check for SSL
            local ssl="❌"
            if grep -q "listen 443 ssl" "$site" 2>/dev/null; then
                ssl="✅"
            fi
            
            # Get target
            local target=$(grep -oP "proxy_pass \K.*" "$site" | head -1 | tr -d ';' || echo "N/A")
            
            echo -e "${BLUE}$count.${NC} $sitename"
            echo "   Status: $enabled"
            echo "   SSL: $ssl"
            echo "   Target: $target"
            echo ""
        fi
    done
    
    if [ $count -eq 0 ]; then
        print_warning "No subdomains found"
    fi
}

list_ssl_certificates() {
    print_header "=== SSL Certificates ==="
    echo ""
    
    if ! command -v certbot >/dev/null 2>&1; then
        print_warning "Certbot not installed"
        return 0
    fi
    
    certbot certificates 2>/dev/null || print_warning "No certificates found"
    echo ""
}

view_logs() {
    echo ""
    print_header "=== View Subdomain Logs ==="
    echo ""
    
    PS3="Select subdomain to view logs (or 0 to cancel): "
    
    local sites=()
    for site in /etc/nginx/sites-available/*; do
        if [ -f "$site" ] && [ "$(basename "$site")" != "default" ]; then
            sites+=("$(basename "$site")")
        fi
    done
    
    if [ ${#sites[@]} -eq 0 ]; then
        print_warning "No subdomains found"
        return 0
    fi
    
    select sitename in "${sites[@]}"; do
        if [ -n "$sitename" ]; then
            echo ""
            print_message "Logs for $sitename"
            echo ""
            echo "1) Access log (last 50 lines)"
            echo "2) Error log (last 50 lines)"
            echo "3) Access log (real-time)"
            echo "4) Error log (real-time)"
            echo "5) Back"
            echo ""
            
            read -p "Select option [1-5]: " log_choice
            
            case $log_choice in
                1)
                    if [ -f "/var/log/nginx/${sitename}_access.log" ]; then
                        tail -n 50 "/var/log/nginx/${sitename}_access.log"
                    else
                        print_warning "Access log not found"
                    fi
                    ;;
                2)
                    if [ -f "/var/log/nginx/${sitename}_error.log" ]; then
                        tail -n 50 "/var/log/nginx/${sitename}_error.log"
                    else
                        print_warning "Error log not found"
                    fi
                    ;;
                3)
                    if [ -f "/var/log/nginx/${sitename}_access.log" ]; then
                        print_message "Press Ctrl+C to exit"
                        tail -f "/var/log/nginx/${sitename}_access.log"
                    else
                        print_warning "Access log not found"
                    fi
                    ;;
                4)
                    if [ -f "/var/log/nginx/${sitename}_error.log" ]; then
                        print_message "Press Ctrl+C to exit"
                        tail -f "/var/log/nginx/${sitename}_error.log"
                    else
                        print_warning "Error log not found"
                    fi
                    ;;
                5)
                    return 0
                    ;;
            esac
        fi
        break
    done
}

enable_subdomain() {
    echo ""
    print_header "=== Enable Subdomain ==="
    echo ""
    
    PS3="Select subdomain to enable (or 0 to cancel): "
    
    local sites=()
    for site in /etc/nginx/sites-available/*; do
        if [ -f "$site" ] && [ "$(basename "$site")" != "default" ]; then
            local sitename=$(basename "$site")
            if [ ! -L "/etc/nginx/sites-enabled/$sitename" ]; then
                sites+=("$sitename")
            fi
        fi
    done
    
    if [ ${#sites[@]} -eq 0 ]; then
        print_warning "No disabled subdomains found"
        return 0
    fi
    
    select sitename in "${sites[@]}"; do
        if [ -n "$sitename" ]; then
            ln -sf "/etc/nginx/sites-available/$sitename" "/etc/nginx/sites-enabled/$sitename"
            
            if nginx -t 2>&1 | grep -q "test is successful"; then
                systemctl reload nginx
                print_success "$sitename enabled successfully"
            else
                print_error "Nginx configuration test failed"
                nginx -t
                rm "/etc/nginx/sites-enabled/$sitename"
            fi
        fi
        break
    done
}

disable_subdomain() {
    echo ""
    print_header "=== Disable Subdomain ==="
    echo ""
    
    PS3="Select subdomain to disable (or 0 to cancel): "
    
    local sites=()
    for site in /etc/nginx/sites-enabled/*; do
        if [ -L "$site" ] && [ "$(basename "$site")" != "default" ]; then
            sites+=("$(basename "$site")")
        fi
    done
    
    if [ ${#sites[@]} -eq 0 ]; then
        print_warning "No enabled subdomains found"
        return 0
    fi
    
    select sitename in "${sites[@]}"; do
        if [ -n "$sitename" ]; then
            read -p "Are you sure you want to disable $sitename? (y/n): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                rm "/etc/nginx/sites-enabled/$sitename"
                systemctl reload nginx
                print_success "$sitename disabled successfully"
            else
                print_message "Operation cancelled"
            fi
        fi
        break
    done
}

edit_subdomain() {
    echo ""
    print_header "=== Edit Subdomain Configuration ==="
    echo ""
    
    PS3="Select subdomain to edit (or 0 to cancel): "
    
    local sites=()
    for site in /etc/nginx/sites-available/*; do
        if [ -f "$site" ] && [ "$(basename "$site")" != "default" ]; then
            sites+=("$(basename "$site")")
        fi
    done
    
    if [ ${#sites[@]} -eq 0 ]; then
        print_warning "No subdomains found"
        return 0
    fi
    
    select sitename in "${sites[@]}"; do
        if [ -n "$sitename" ]; then
            local config_file="/etc/nginx/sites-available/$sitename"
            
            # Backup
            cp "$config_file" "${config_file}.backup.$(date +%Y%m%d_%H%M%S)"
            
            # Edit
            ${EDITOR:-nano} "$config_file"
            
            # Test
            if nginx -t 2>&1 | grep -q "test is successful"; then
                read -p "Configuration test passed. Reload Nginx? (y/n): " reload
                if [[ $reload =~ ^[Yy]$ ]]; then
                    systemctl reload nginx
                    print_success "Nginx reloaded successfully"
                fi
            else
                print_error "Configuration test failed!"
                nginx -t
                read -p "Restore backup? (y/n): " restore
                if [[ $restore =~ ^[Yy]$ ]]; then
                    mv "${config_file}.backup."* "$config_file"
                    print_success "Backup restored"
                fi
            fi
        fi
        break
    done
}

remove_subdomain() {
    echo ""
    print_header "=== Remove Subdomain ==="
    echo ""
    print_warning "This will permanently delete the subdomain configuration"
    echo ""
    
    PS3="Select subdomain to remove (or 0 to cancel): "
    
    local sites=()
    for site in /etc/nginx/sites-available/*; do
        if [ -f "$site" ] && [ "$(basename "$site")" != "default" ]; then
            sites+=("$(basename "$site")")
        fi
    done
    
    if [ ${#sites[@]} -eq 0 ]; then
        print_warning "No subdomains found"
        return 0
    fi
    
    select sitename in "${sites[@]}"; do
        if [ -n "$sitename" ]; then
            echo ""
            print_warning "You are about to remove: $sitename"
            read -p "Type 'DELETE' to confirm: " confirm
            
            if [ "$confirm" = "DELETE" ]; then
                # Remove enabled symlink
                if [ -L "/etc/nginx/sites-enabled/$sitename" ]; then
                    rm "/etc/nginx/sites-enabled/$sitename"
                    print_message "Removed from sites-enabled"
                fi
                
                # Backup and remove config
                if [ -f "/etc/nginx/sites-available/$sitename" ]; then
                    cp "/etc/nginx/sites-available/$sitename" "/root/${sitename}.backup.$(date +%Y%m%d_%H%M%S)"
                    rm "/etc/nginx/sites-available/$sitename"
                    print_message "Configuration backed up and removed"
                fi
                
                # Remove auth file
                if [ -f "/etc/nginx/.htpasswd_$sitename" ]; then
                    rm "/etc/nginx/.htpasswd_$sitename"
                    print_message "Authentication file removed"
                fi
                
                # Reload Nginx
                if nginx -t 2>&1 | grep -q "test is successful"; then
                    systemctl reload nginx
                    print_success "Nginx reloaded"
                fi
                
                # Ask about SSL certificate
                if command -v certbot >/dev/null 2>&1; then
                    read -p "Do you want to remove SSL certificate for $sitename? (y/n): " remove_ssl
                    if [[ $remove_ssl =~ ^[Yy]$ ]]; then
                        certbot delete --cert-name "$sitename" 2>/dev/null && \
                        print_success "SSL certificate removed" || \
                        print_warning "Could not remove SSL certificate"
                    fi
                fi
                
                print_success "$sitename removed successfully"
                print_message "Backup saved to /root/${sitename}.backup.*"
            else
                print_message "Operation cancelled"
            fi
        fi
        break
    done
}

test_subdomain() {
    echo ""
    print_header "=== Test Subdomain ==="
    echo ""
    
    PS3="Select subdomain to test (or 0 to cancel): "
    
    local sites=()
    for site in /etc/nginx/sites-available/*; do
        if [ -f "$site" ] && [ "$(basename "$site")" != "default" ]; then
            sites+=("$(basename "$site")")
        fi
    done
    
    if [ ${#sites[@]} -eq 0 ]; then
        print_warning "No subdomains found"
        return 0
    fi
    
    select sitename in "${sites[@]}"; do
        if [ -n "$sitename" ]; then
            echo ""
            print_message "Testing $sitename..."
            echo ""
            
            # DNS check
            print_message "1. DNS Resolution:"
            if command -v dig >/dev/null 2>&1; then
                dig +short "$sitename" | head -1
            else
                nslookup "$sitename" | grep "Address" | tail -1
            fi
            echo ""
            
            # HTTP check
            print_message "2. HTTP Response:"
            if command -v curl >/dev/null 2>&1; then
                curl -I -s --max-time 10 "http://$sitename" | head -5 || print_warning "HTTP request failed"
            fi
            echo ""
            
            # HTTPS check
            print_message "3. HTTPS Response:"
            if command -v curl >/dev/null 2>&1; then
                curl -I -s --max-time 10 "https://$sitename" | head -5 || print_warning "HTTPS request failed"
            fi
            echo ""
            
            # SSL certificate check
            print_message "4. SSL Certificate:"
            if command -v openssl >/dev/null 2>&1; then
                echo | openssl s_client -connect "$sitename:443" -servername "$sitename" 2>/dev/null | \
                openssl x509 -noout -dates 2>/dev/null || print_warning "Could not check SSL"
            fi
            echo ""
        fi
        break
    done
}

nginx_status() {
    echo ""
    print_header "=== Nginx Status ==="
    echo ""
    
    systemctl status nginx --no-pager
    echo ""
    
    print_message "Configuration test:"
    nginx -t
    echo ""
}

main_menu() {
    while true; do
        clear
        echo ""
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║          Subdomain Management Script                      ║"
        echo "║                  by Sovath.C                               ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""
        echo "1)  List all subdomains"
        echo "2)  View subdomain logs"
        echo "3)  Enable subdomain"
        echo "4)  Disable subdomain"
        echo "5)  Edit subdomain configuration"
        echo "6)  Remove subdomain"
        echo "7)  Test subdomain"
        echo "8)  List SSL certificates"
        echo "9)  Nginx status"
        echo "10) Reload Nginx"
        echo "11) Restart Nginx"
        echo "0)  Exit"
        echo ""
        
        read -p "Select option [0-11]: " choice
        
        case $choice in
            1) list_subdomains ; read -p "Press Enter to continue..." ;;
            2) view_logs ;;
            3) enable_subdomain ; read -p "Press Enter to continue..." ;;
            4) disable_subdomain ; read -p "Press Enter to continue..." ;;
            5) edit_subdomain ; read -p "Press Enter to continue..." ;;
            6) remove_subdomain ; read -p "Press Enter to continue..." ;;
            7) test_subdomain ; read -p "Press Enter to continue..." ;;
            8) list_ssl_certificates ; read -p "Press Enter to continue..." ;;
            9) nginx_status ; read -p "Press Enter to continue..." ;;
            10)
                if nginx -t 2>&1 | grep -q "test is successful"; then
                    systemctl reload nginx
                    print_success "Nginx reloaded successfully"
                else
                    print_error "Configuration test failed"
                    nginx -t
                fi
                read -p "Press Enter to continue..."
                ;;
            11)
                systemctl restart nginx
                print_success "Nginx restarted successfully"
                read -p "Press Enter to continue..."
                ;;
            0)
                print_message "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option"
                sleep 1
                ;;
        esac
    done
}

# Main execution
check_root
main_menu
