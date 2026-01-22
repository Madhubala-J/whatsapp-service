# HTTPS Setup Guide for WhatsApp Service

This guide provides multiple options to enable HTTPS for your WhatsApp webhook service deployed on Azure Container Instances.

## 🎯 Quick Comparison

| Option | Cost | Setup Time | SSL Certificate | Best For |
|--------|------|------------|-----------------|----------|
| **Azure Front Door** | ~$35/month | 10 min | FREE (Auto-managed) | ✅ **Recommended** |
| **Cloudflare Tunnel** | FREE | 5 min | FREE (Auto-managed) | Budget-friendly |
| **Azure App Gateway** | ~$125/month | 30 min | Manual/Key Vault | Enterprise |
| **Nginx + Let's Encrypt** | Container cost only | 15 min | FREE (Auto-renewed) | Self-managed |

---

## ✅ Option 1: Azure Front Door (RECOMMENDED)

**Pros:**
- ✅ FREE managed SSL certificates
- ✅ Global CDN and DDoS protection
- ✅ Automatic HTTPS redirect
- ✅ Health monitoring included
- ✅ No domain required (uses *.azurefd.net)

**Setup:**

```powershell
# Run the deployment script
.\deploy-frontdoor-https.ps1

# Or manually:
az afd profile create --resource-group "Hai-indexer" --profile-name "whatsapp-fd" --sku Standard_AzureFrontDoor
```

**Result:**
- HTTPS URL: `https://whatsapp-fd-endpoint-xxxxx.azurefd.net`
- Webhook URL: `https://whatsapp-fd-endpoint-xxxxx.azurefd.net/webhook`

---

## 🆓 Option 2: Cloudflare Tunnel (100% FREE)

**Pros:**
- ✅ Completely FREE
- ✅ No public IP needed
- ✅ Automatic SSL
- ✅ Works with custom domains

**Setup:**

### Step 1: Install Cloudflare Tunnel
```bash
# Download cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared

# Login to Cloudflare
./cloudflared tunnel login

# Create a tunnel
./cloudflared tunnel create whatsapp-service

# Configure the tunnel
cat > config.yml <<EOF
tunnel: <TUNNEL-ID>
credentials-file: /root/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: whatsapp.yourdomain.com
    service: http://whatsapp-service-hai.eastus.azurecontainer.io:3000
  - service: http_status:404
EOF

# Run the tunnel
./cloudflared tunnel run whatsapp-service
```

### Step 2: Add DNS Record
```bash
cloudflared tunnel route dns whatsapp-service whatsapp.yourdomain.com
```

**Result:**
- HTTPS URL: `https://whatsapp.yourdomain.com`
- Webhook URL: `https://whatsapp.yourdomain.com/webhook`

---

## 🏢 Option 3: Azure Application Gateway

**Pros:**
- ✅ Enterprise-grade
- ✅ WAF (Web Application Firewall)
- ✅ Advanced routing

**Cons:**
- ❌ Expensive (~$125/month)
- ❌ Requires SSL certificate management

**Setup:**

```powershell
# Run the deployment script
.\deploy-https.ps1 -DomainName "whatsapp.yourdomain.com"
```

---

## 🐳 Option 4: Nginx Reverse Proxy with Let's Encrypt

**Pros:**
- ✅ Full control
- ✅ FREE SSL (Let's Encrypt)
- ✅ Lightweight

**Setup:**

### Create nginx-ssl.conf
```nginx
server {
    listen 80;
    server_name whatsapp.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name whatsapp.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/whatsapp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/whatsapp.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://whatsapp-service-hai.eastus.azurecontainer.io:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🚀 Recommended Quick Start

For the **fastest and easiest** setup, use **Azure Front Door**:

```powershell
# 1. Run the Front Door deployment script
.\deploy-frontdoor-https.ps1

# 2. Wait 5-10 minutes for propagation

# 3. Test the HTTPS endpoint
curl https://your-endpoint.azurefd.net/health

# 4. Configure WhatsApp webhook with the HTTPS URL
```

---

## 📝 WhatsApp Webhook Configuration

Once HTTPS is set up, configure your webhook in Meta Developer Console:

1. Go to: https://developers.facebook.com/apps
2. Select your WhatsApp Business App
3. Navigate to: **WhatsApp** → **Configuration** → **Webhook**
4. Click **Edit** and enter:
   - **Callback URL**: `https://your-https-endpoint/webhook`
   - **Verify Token**: `Haiindexer-service`
5. Click **Verify and Save**
6. Subscribe to webhook fields: `messages`

---

## 🔍 Testing Your HTTPS Setup

```bash
# Test health endpoint
curl https://your-https-endpoint/health

# Test webhook verification (GET request)
curl "https://your-https-endpoint/webhook?hub.mode=subscribe&hub.verify_token=Haiindexer-service&hub.challenge=test123"

# Should return: test123
```

---

## 💡 Cost Comparison (Monthly)

- **Cloudflare Tunnel**: $0 (FREE)
- **Azure Front Door Standard**: ~$35
- **Azure Application Gateway**: ~$125
- **Nginx on VM**: ~$10-20 (VM cost)

---

## ❓ Which Option Should I Choose?

- **For Production**: Azure Front Door (best balance of features and cost)
- **For Budget/Testing**: Cloudflare Tunnel (completely free)
- **For Enterprise**: Azure Application Gateway (advanced security)
- **For Full Control**: Nginx + Let's Encrypt (self-managed)

---

## 📞 Support

If you encounter issues:
1. Check Azure Front Door propagation status
2. Verify DNS records are correct
3. Test backend health: `http://whatsapp-service-hai.eastus.azurecontainer.io:3000/health`
4. Check Front Door health probe status in Azure Portal

