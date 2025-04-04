#!/bin/bash
# CyberShieldX Agent Installer for Linux
# Usage: sudo bash install-linux.sh

echo "CyberShieldX Agent Installer for Linux"
echo "======================================="

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root"
   exit 1
fi

# Configuration
INSTALL_DIR="/opt/cybershieldx-agent"
SERVER_URL="https://cybershieldx.be"

# Get server URL from user (with default)
echo -n "Enter Server URL (press Enter for default: $SERVER_URL): "
read USER_SERVER_URL

if [ ! -z "$USER_SERVER_URL" ]; then
    SERVER_URL="$USER_SERVER_URL"
fi
echo "Using server URL: $SERVER_URL"

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

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
    echo "Detected OS: $OS $VERSION"
else
    echo "Could not detect OS, assuming Ubuntu/Debian"
    OS="debian"
fi

# Install dependencies
echo "Installing dependencies..."

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    elif [ "$OS" = "fedora" ]; then
        dnf -y install nodejs
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
        yum install -y nodejs
    else
        echo "Unsupported OS: $OS"
        echo "Please install Node.js manually"
        exit 1
    fi
    
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
    "platform": "linux",
    "hostname": "$(hostname)"
}
EOF

# Download agent files
echo "Downloading agent files..."
curl -s -o /tmp/cybershieldx-agent.tar.gz "$SERVER_URL/downloads/cybershieldx-agent-linux.tar.gz"
tar -xzf /tmp/cybershieldx-agent.tar.gz -C $INSTALL_DIR
rm /tmp/cybershieldx-agent.tar.gz

# Create systemd service
echo "Creating systemd service..."
cat > /etc/systemd/system/cybershieldx-agent.service << EOF
[Unit]
Description=CyberShieldX Security Agent
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
