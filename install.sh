#!/bin/bash
# Path: /home/dhqytvjq/sidvps.nauhyuh.top/install.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -f "/usr/local/bin/sidvps" ]; then
    clear
    echo -e "${YELLOW}====================================================${NC}"
    echo -e "          THÔNG BÁO: HỆ THỐNG ĐÃ ĐƯỢC CÀI ĐẶT"
    echo -e "${YELLOW}====================================================${NC}"
    echo -e "Phát hiện bộ công cụ ${GREEN}sidvps${NC} đã tồn tại."
    echo ""
    echo "Lựa chọn của bạn:"
    echo -e " 1) ${RED}Xóa đi cài lại mới${NC}"
    echo -e " 2) ${GREEN}Thoát cài đặt${NC}"
    echo -e "----------------------------------------------------"
    
    # FIX: Ép đọc dữ liệu từ terminal
    read -p "Nhập lựa chọn (1-2): " check_choice < /dev/tty

    case $check_choice in
        1)
            echo -e "${YELLOW}>>> Đang gỡ bỏ bản cũ...${NC}"
            sudo systemctl stop sidvps-ui 2>/dev/null
            sudo systemctl disable sidvps-ui 2>/dev/null
            sudo rm -f /etc/systemd/system/sidvps-ui.service
            sudo rm -f /usr/local/bin/sidvps
            sudo rm -rf /opt/sidvps
            sudo systemctl daemon-reload
            ;;
        2)
            echo -e "${GREEN}Đã hủy. Tạm biệt!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Lựa chọn không hợp lệ. Thoát!${NC}"
            exit 1
            ;;
    esac
fi

# Tiếp tục cài đặt...
echo -e "${GREEN}>>> Đang bắt đầu cài đặt sidvps...${NC}"
sudo apt-get update -y && sudo apt-get install -y curl wget git tar
echo -e "${YELLOW}>>> Đang dọn dẹp các phiên bản Node.js cũ bị đụng độ...${NC}"
sudo apt-get remove --purge -y nodejs npm libnode-dev || true
sudo apt-get autoremove -y || true
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

sudo rm -rf /opt/sidvps
echo -e "${GREEN}>>> Đang tải mã nguồn kiến trúc Vue + Node từ Github...${NC}"
sudo git clone https://github.com/huanth/sidvps.git /opt/sidvps

# Cấu hình file thực thi CLI
if [ -f "/opt/sidvps/sidvps" ]; then
    sudo mv /opt/sidvps/sidvps /usr/local/bin/sidvps
    sudo chmod +x /usr/local/bin/sidvps
fi

echo -e "${YELLOW}>>> Đang cài đặt thư viện và Build Frontend Vue...${NC}"
cd /opt/sidvps/frontend && sudo npm install && sudo npm run build

echo -e "${YELLOW}>>> Đang cài đặt thư viện cho Backend API...${NC}"
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
echo -e "${GREEN} CÀI ĐẶT HOÀN TẤT!${NC}"
echo " CLI: Gõ 'sidvps'"
echo " WEB: http://$(curl -s ifconfig.me):21999"
echo "===================================================="
