RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -f "/usr/local/bin/sidvps" ]; then
    clear
    echo -e "${YELLOW}====================================================${NC}"
    echo -e "          NOTICE: SYSTEM ALREADY INSTALLED"
    echo -e "${YELLOW}====================================================${NC}"
    echo -e "Detected ${GREEN}sidvps${NC} toolkit already exists."
    echo ""
    echo "Your options:"
    echo -e " 1) ${RED}Remove and clean reinstall${NC}"
    echo -e " 2) ${GREEN}Exit installation${NC}"
    echo -e "----------------------------------------------------"
    
    # FIX: Force read data from terminal
    read -p "Select option (1-2): " check_choice < /dev/tty

    case $check_choice in
        1)
            echo -e "${YELLOW}>>> Removing old version...${NC}"
            sudo systemctl stop sidvps-ui 2>/dev/null
            sudo systemctl disable sidvps-ui 2>/dev/null
            sudo rm -f /etc/systemd/system/sidvps-ui.service
            sudo rm -f /usr/local/bin/sidvps
            sudo rm -rf /opt/sidvps
            sudo systemctl daemon-reload
            ;;
        2)
            echo -e "${GREEN}Canceled. Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid selection. Exiting!${NC}"
            exit 1
            ;;
    esac
fi

# Continue installation...
echo -e "${GREEN}>>> Starting sidvps installation...${NC}"
sudo apt-get update -y && sudo apt-get install -y curl wget git tar
echo -e "${YELLOW}>>> Cleaning up conflicting old Node.js versions...${NC}"
sudo apt-get remove --purge -y nodejs npm libnode-dev || true
sudo apt-get autoremove -y || true
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

sudo rm -rf /opt/sidvps
echo -e "${GREEN}>>> Downloading Vue + Node architecture source from Github...${NC}"
sudo git clone https://github.com/huanth/sidvps.git /opt/sidvps

# Configure CLI executable
if [ -f "/opt/sidvps/sidvps" ]; then
    sudo mv /opt/sidvps/sidvps /usr/local/bin/sidvps
    sudo chmod +x /usr/local/bin/sidvps
fi

echo -e "${YELLOW}>>> Installing dependencies and Building Frontend Vue...${NC}"
cd /opt/sidvps/frontend && sudo npm install && sudo npm run build

echo -e "${YELLOW}>>> Installing dependencies for Backend API...${NC}"
cd /opt/sidvps/backend && sudo npm install

sudo bash -c 'cat > /etc/systemd/system/sidvps-ui.service <<EOF
[Unit]
Description=SidVPS Advanced Vue Dashboard API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/sidvps/backend
ExecStart=/usr/bin/node /opt/sidvps/backend/server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF'

sudo systemctl daemon-reload && sudo systemctl enable sidvps-ui && sudo systemctl restart sidvps-ui
[ -x "$(command -v ufw)" ] && sudo ufw allow 21999/tcp

echo "===================================================="
echo -e "${GREEN} INSTALLATION COMPLETE!${NC}"
echo " CLI: Type 'sidvps'"
echo " WEB: http://$(curl -s ifconfig.me):21999"
echo "===================================================="
