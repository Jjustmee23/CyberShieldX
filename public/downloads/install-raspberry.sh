#!/bin/bash
# CyberShieldX Agent Installer for Raspberry Pi
# Usage: sudo bash install-raspberry.sh

echo "CyberShieldX Agent Installer for Raspberry Pi"
echo "============================================="

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root"
   exit 1
fi

# Check if running on a Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo && ! grep -q "BCM" /proc/cpuinfo; then
    echo "Warning: This system does not appear to be a Raspberry Pi."
    echo -n "Continue anyway? (y/n): "
    read CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

# Configuration
SERVER_URL="https://cybershieldx.be"
INSTALL_DIR="/opt/cybershieldx-agent"

# Get client ID
echo -n "Enter your Client ID (provided by your administrator): "
read CLIENT_ID

if [ -z "$CLIENT_ID" ]; then
    echo "Client ID is required. Please contact your administrator."
    exit 1
fi

# Create installation directory
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR || exit 1

# Install dependencies
echo "Installing dependencies..."

# Update package lists
apt-get update

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    
    # For Raspberry Pi, we'll use the NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
    apt-get install -y nodejs
    
    # Verify installation
    if ! command -v node &> /dev/null; then
        echo "Failed to install Node.js"
        exit 1
    fi
fi

# Create configuration file
echo "Creating configuration..."
cat > "$INSTALL_DIR/config.json" << EOF
{
    "serverUrl": "$SERVER_URL",
    "clientId": "$CLIENT_ID",
    "installDate": "$(date '+%Y-%m-%d %H:%M:%S')",
    "agentVersion": "1.0.0",
    "platform": "raspberry-pi",
    "hostname": "$(hostname)",
    "raspberryPiModel": "$(cat /proc/cpuinfo | grep 'Model' | cut -d ':' -f 2 | xargs || echo 'Unknown')"
}
EOF

# Download agent files optimized for Raspberry Pi
echo "Downloading agent files..."
curl -s -o /tmp/cybershieldx-agent.tar.gz "$SERVER_URL/downloads/cybershieldx-agent-raspberry.tar.gz"
tar -xzf /tmp/cybershieldx-agent.tar.gz -C $INSTALL_DIR
rm /tmp/cybershieldx-agent.tar.gz

# Create systemd service
echo "Creating systemd service..."
cat > /etc/systemd/system/cybershieldx-agent.service << EOF
[Unit]
Description=CyberShieldX Security Agent for Raspberry Pi
After=network.target

[Service]
ExecStart=/usr/bin/node $INSTALL_DIR/agent.js
WorkingDirectory=$INSTALL_DIR
Restart=always
User=root
Group=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd, enable and start service
systemctl daemon-reload
systemctl enable cybershieldx-agent
systemctl start cybershieldx-agent

echo "CyberShieldX Agent installed successfully!"
echo "Service Name: cybershieldx-agent"
echo "Installation Directory: $INSTALL_DIR"
echo "Client ID: $CLIENT_ID"

# Verify service is running
if systemctl is-active --quiet cybershieldx-agent; then
    echo "Service is running."
else
    echo "Service failed to start. Check logs with: journalctl -u cybershieldx-agent"
fi

echo "Installation completed successfully."
