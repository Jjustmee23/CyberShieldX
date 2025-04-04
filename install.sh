#!/bin/bash
set -e

# ------------------------------------------------------------------------------
# CyberShieldX Installation and Update Script
# ------------------------------------------------------------------------------
# This script installs or updates the CyberShieldX security platform
# It handles all dependencies, database setup, and configuration

# ------------------------------------------------------------------------------
# Configurabele variabelen
# ------------------------------------------------------------------------------
PROJECT_DIR="/opt/cybershieldx"
REPO_URL="https://github.com/yourusername/cybershieldx.git"  # Update this with your actual repo
APP_DOMAIN="cybershieldx.com"  # Update this with your domain

# ------------------------------------------------------------------------------
# 1. Check of het script als root draait
# ------------------------------------------------------------------------------
if [ "$EUID" -ne 0 ]; then
    echo "Dit script moet als root of via sudo worden uitgevoerd."
    exit 1
fi
