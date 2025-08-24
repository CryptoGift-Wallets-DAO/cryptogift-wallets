# 🚀 VERCEL ENVIRONMENT VARIABLES SETUP

## 📋 CRITICAL VARIABLES FOR WALLET DASHBOARD

Copy these to your Vercel project settings → Environment Variables

### 🔴 REQUIRED - System won't work without these

```bash
# ThirdWeb (Already configured)
NEXT_PUBLIC_TW_CLIENT_ID=e9e9be7c66f8a4fb50b54b5a6f39a0cf
TW_SECRET_KEY=your_thirdweb_secret_key

# Deployer wallet (Already configured) 
PRIVATE_KEY_DEPLOY=your_deployer_private_key

# RPC URLs (Already configured)
NEXT_PUBLIC_RPC_URL=https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e

# Redis/Upstash (Already configured)
UPSTASH_REDIS_REST_URL=https://exotic-alien-13383.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Contracts (Already configured)
NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS=0xE9F316159a0830114252a96a6B7CA6efD874650F
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0x46175CfC233500DA803841DEef7f2816e7A129E0
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### 🟡 IMPORTANT - For full wallet functionality

```bash
# WalletConnect - REQUIRED for mobile wallet support
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id
# Get from: https://cloud.walletconnect.com/

# 0x Protocol - Recommended for better swap rates
ZEROX_API_KEY=your_0x_api_key
# Get from: https://dashboard.0x.org/
# Free tier available with 100,000 requests/month
```

### 🟢 GASLESS TRANSACTIONS - Enable when ready

```bash
# Biconomy MEE (Modular Execution Environment) - PREFERRED
BICONOMY_MEE_API_KEY=your_mee_api_key
BICONOMY_PROJECT_ID=your_project_id
# Get from: https://dashboard.biconomy.io/

# Biconomy Legacy Paymaster - FALLBACK
BICONOMY_PAYMASTER_API_KEY=your_paymaster_api_key
BICONOMY_BUNDLER_URL=https://bundler.biconomy.io/api/v2/84532/your_api_key
BICONOMY_PAYMASTER_URL=https://paymaster.biconomy.io/api/v2/84532/your_api_key

# Note: The system will work with gas-paid transactions if these are not configured
```

### 🔵 OPTIONAL - Analytics & Monitoring

```bash
# Amplitude Analytics
NEXT_PUBLIC_AMPLITUDE_API_KEY=your_amplitude_key
NEXT_PUBLIC_AMPLITUDE_SERVER_ZONE=US

# PostHog Product Analytics
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token
SENTRY_ORG=your_org
SENTRY_PROJECT=your_project
```

### 🟣 OPTIONAL - On-Ramp Providers

```bash
# Transak
TRANSAK_API_KEY=your_transak_api_key

# MoonPay
MOONPAY_API_KEY=your_moonpay_api_key
MOONPAY_SECRET_KEY=your_moonpay_secret

# Coinbase Pay
COINBASE_PAY_APP_ID=your_coinbase_pay_app_id
```

### ⚫ OPTIONAL - Push Notifications

```bash
# Push Protocol
PUSH_PROTOCOL_ENV=staging # or prod
PUSH_CHANNEL_ADDRESS=your_channel_address

# Web Push VAPID Keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:your@email.com
```

---

## 🔧 HOW TO ADD TO VERCEL

1. Go to your Vercel project dashboard
2. Click on "Settings" tab
3. Navigate to "Environment Variables" in the left sidebar
4. For each variable:
   - Enter the Key (e.g., `NEXT_PUBLIC_WC_PROJECT_ID`)
   - Enter the Value (your actual API key)
   - Select environments: ✅ Production ✅ Preview ✅ Development
   - Click "Save"

---

## 📊 CURRENT STATUS

### ✅ WORKING WITHOUT ADDITIONAL CONFIG
- Basic wallet connection (MetaMask)
- NFT minting with gas-paid transactions
- Escrow gift creation
- Transaction history
- Network information

### ⚠️ REQUIRES CONFIGURATION
- **Mobile wallet support** → Add `NEXT_PUBLIC_WC_PROJECT_ID`
- **Better swap rates** → Add `ZEROX_API_KEY`
- **Gasless transactions** → Add Biconomy keys

### 🚀 GAS-PAID FALLBACK
The system is designed with robust gas-paid fallback:
- If Biconomy is not configured → Uses gas-paid
- If gasless transaction fails → Automatically retries with gas-paid
- If paymaster is down → Falls back to gas-paid
- **Result**: Transactions ALWAYS work, gasless is a bonus

---

## 🔑 WHERE TO GET API KEYS

### WalletConnect (Mobile Wallets)
1. Visit https://cloud.walletconnect.com/
2. Create a new project
3. Copy the Project ID
4. **Free tier**: Unlimited connections

### 0x Protocol (Swaps)
1. Visit https://dashboard.0x.org/
2. Sign up for free account
3. Create an API key
4. **Free tier**: 100,000 requests/month

### Biconomy (Gasless)
1. Visit https://dashboard.biconomy.io/
2. Create a new project
3. Select "Base Sepolia" network
4. Configure Paymaster with spending limits
5. Copy API keys
6. **Free tier**: Limited sponsored transactions for testing

### Amplitude (Analytics)
1. Visit https://amplitude.com/
2. Create a new project
3. Get API key from Settings
4. **Free tier**: 10 million events/month

---

## 🎯 PRIORITY ORDER

1. **First** (Required for mobile): `NEXT_PUBLIC_WC_PROJECT_ID`
2. **Second** (Better UX): `ZEROX_API_KEY`
3. **Third** (When ready): Biconomy keys for gasless
4. **Fourth** (Nice to have): Analytics keys

---

## 💡 IMPORTANT NOTES

1. **Security**: Never commit these keys to git
2. **Testing**: Test in Preview environment first
3. **Fallback**: System always falls back to gas-paid if gasless fails
4. **Monitoring**: Check Vercel Functions logs for transaction status

---

## 🚨 TROUBLESHOOTING

If transactions fail:
1. Check if `PRIVATE_KEY_DEPLOY` wallet has ETH for gas
2. Verify contract addresses are correct
3. Check Vercel Function logs for specific errors
4. Test with gas-paid first, then enable gasless

---

Made by mbxarts.com The Moon in a Box property

Co-Author: Godez22