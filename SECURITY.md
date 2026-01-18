# 🔐 Security Notes

## Sensitive Credentials

This project contains sensitive API credentials and shared keys. **NEVER** commit these to version control.

### Protected Files

- `.env` - Contains all secrets and API keys
- `.env.local` - Local overrides

These files are automatically ignored by Git via `.gitignore`.

### Amazon Ads API Credentials

1. **Client ID**: `amzn1.application-oa2-client.a1d87faf6fd543fd91e5f75108c65227`
2. **Client Secret**: Stored in `.env` (not in version control)
3. **Shared Key**: Dynamically generated key for transaction validation
   - Format: `2:dfm_...==:ACtAL...==`
   - **CRITICAL**: This key is NOT stored on Amazon's servers
   - Used to validate transactions outside your app
   - Keep this key secure and backed up

### Setup Instructions

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your actual credentials:
   - Add your `AMAZON_CLIENT_SECRET`
   - The shared key is already populated
   - Configure database and Redis URLs

3. **NEVER** share your `.env` file or commit it to Git

### Key Rotation

If your shared key or client secret is compromised:

1. Revoke access in Amazon Developer Console
2. Generate new credentials
3. Update `.env` file
4. Restart the application

### Backup

Store a secure backup of your shared key in a password manager (1Password, LastPass, etc.) as **Amazon does not store it on their servers**.

## Security Best Practices

- [ ] Never log sensitive credentials
- [ ] Use environment variables for all secrets
- [ ] Rotate keys regularly
- [ ] Enable 2FA on Amazon Developer account
- [ ] Monitor API access logs
