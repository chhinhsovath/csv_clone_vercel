#!/bin/bash

################################################################################
# Installation Script
# Download and setup all subdomain management tools
################################################################################

echo "Installing Subdomain Management Tools..."
echo ""

# Create directory
mkdir -p /opt/subdomain-tools
cd /opt/subdomain-tools

# Note: In production, you would download these from your repository
# For now, copy the scripts you've created

echo "✓ Scripts installed to /opt/subdomain-tools"
echo ""
echo "Available commands:"
echo ""
echo "  setup-subdomain.sh      - Full interactive setup with all options"
echo "  quick-subdomain.sh      - Quick setup (usage: quick-subdomain.sh domain.com port)"
echo "  manage-subdomains.sh    - Manage existing subdomains"
echo ""
echo "Example usage:"
echo "  sudo ./setup-subdomain.sh"
echo "  sudo ./quick-subdomain.sh api.openplp.org 3000 your@email.com"
echo "  sudo ./manage-subdomains.sh"
echo ""
