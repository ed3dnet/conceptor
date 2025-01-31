#!/bin/bash

# Exit on any error
set -e

# Update package lists
sudo apt update

# Install all required packages
sudo apt install -y \
    build-essential \
    g++ \
    libicu-dev \
    libssl-dev \
    pkg-config \
    libreadline-dev \
    zlib1g-dev \
    uuid-dev \
    libsecret-1-dev \
    libsecret-1-0 \
    dbus-x11 \
    gnome-keyring

echo "All packages have been installed successfully!"