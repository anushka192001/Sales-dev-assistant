#!/bin/bash

# AI-SDR Deployment Script
# This script deploys the AI-SDR application to a remote server

set -e  # Exit on any error

# Configuration
SERVER_IP="localhost"
SSH_KEY="~/.ssh/id_ed25519"
REMOTE_USER="root"
REMOTE_PATH="/opt/ai-sdr"
LOCAL_PATH="/Users/admin/Desktop/ai-sdr"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting AI-SDR deployment...${NC}"

# Step 1: Test SSH connection
echo -e "${YELLOW}Testing SSH connection...${NC}"
if ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$REMOTE_USER@$SERVER_IP" "echo 'SSH connection successful'"; then
    echo -e "${GREEN}✓ SSH connection verified${NC}"
else
    echo -e "${RED}✗ SSH connection failed${NC}"
    exit 1
fi

# Step 2: Create remote directory if it doesn't exist
echo -e "${YELLOW}Creating remote directory...${NC}"
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" "mkdir -p $REMOTE_PATH"

# Step 3: Stop existing containers (if any)
echo -e "${YELLOW}Stopping existing containers...${NC}"
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" "cd $REMOTE_PATH && docker compose down || true"

# Step 4: Copy files to remote server (excluding unnecessary files)
echo -e "${YELLOW}Copying files to remote server...${NC}"
rsync -avz --progress -e "ssh -i $SSH_KEY" \
    --exclude='node_modules/' \
    --exclude='fnx-next-24/node_modules/' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    --exclude='*.pyo' \
    --exclude='*.log' \
    --exclude='.git/' \
    --exclude='.DS_Store' \
    --exclude='*.tmp' \
    --exclude='*.temp' \
    --exclude='coverage/' \
    --exclude='.vscode/' \
    --exclude='.idea/' \
    --exclude='*.swp' \
    --exclude='*.swo' \
    --exclude='test_client.py' \
    --exclude='README.md' \
    --exclude='CLAUDE.md' \
    --exclude='Queries.txt' \
    "$LOCAL_PATH/" "$REMOTE_USER@$SERVER_IP:$REMOTE_PATH/"

# Step 5: Set proper permissions
echo -e "${YELLOW}Setting file permissions...${NC}"
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" "chown -R $REMOTE_USER:$REMOTE_USER $REMOTE_PATH"

# Step 6: Build and start the application (force rebuild without cache)
echo -e "${YELLOW}Building and starting application with Docker Compose...${NC}"
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" "cd $REMOTE_PATH && docker compose build && docker compose up -d"

# Step 7: Check if containers are running
echo -e "${YELLOW}Checking container status...${NC}"
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" "cd $REMOTE_PATH && docker compose ps"

echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo -e "${GREEN}Your application should be running at: http://$SERVER_IP${NC}"