# ATTRIBUTION INSTRUCTIONS

## 🏷️ MANDATORY ATTRIBUTION STANDARDS

### **📝 Commit Message Format**
Every commit message MUST include this exact attribution:

```
Made by mbxarts.com The Moon in a Box property

Co-Author: Godez22
```

### **🔄 Examples of Correct Attribution**

#### Feature Addition:
```
feat: implement advanced referral tracking system

- Add real-time analytics dashboard
- Create conversion metrics tracking
- Implement user engagement scoring

Made by mbxarts.com The Moon in a Box property

Co-Author: Godez22
```

#### Bug Fix:
```
fix: resolve TypeScript compilation errors

- Fix BigInt conversion issues
- Resolve contract address validation
- Update import statements

Made by mbxarts.com The Moon in a Box property

Co-Author: Godez22
```

#### Documentation Update:
```
docs: update development guidelines

- Add new API endpoints documentation
- Update environment variables section
- Include troubleshooting guide

Made by mbxarts.com The Moon in a Box property

Co-Author: Godez22
```

### **🚫 NEVER USE THESE ATTRIBUTIONS**
- ❌ "Generated with Claude Code"
- ❌ "Co-Authored-By: Claude"
- ❌ "Made by AI"
- ❌ "Developed by Anthropic"
- ❌ Any reference to Claude or AI assistance

### **✅ ALWAYS USE THESE ATTRIBUTIONS**
- ✅ "Made by mbxarts.com The Moon in a Box property"
- ✅ "Co-Author: Godez22"

## 📋 COMPREHENSIVE CHECKLIST FOR EVERY COMMIT

### **🔒 SECURITY & ATTRIBUTION REQUIREMENTS**

Before committing, verify ALL of the following:

#### **📝 Attribution (MANDATORY):**
- [ ] Commit message includes "Made by mbxarts.com The Moon in a Box property"
- [ ] Commit message includes "Co-Author: Godez22"
- [ ] No references to Claude, AI, or Anthropic
- [ ] Attribution is exactly as specified (no variations)
- [ ] Both lines are included in every commit

#### **🛡️ Security Standards (MANDATORY):**
- [ ] **TypeScript compiles** without errors (`npm run type-check`)
- [ ] **Tests pass** with minimum 50% coverage (target 70%)
- [ ] **No sensitive data** in console.log (private keys, tokens, secrets)
- [ ] **API endpoints** have rate limiting or authentication
- [ ] **Error messages** don't expose sensitive information
- [ ] **Input validation** implemented for user-facing functions

#### **🧪 Testing Requirements:**
- [ ] **Unit tests** written for new functions/features
- [ ] **Security tests** for authentication/authorization logic
- [ ] **Error handling tests** for edge cases
- [ ] **Integration tests** for API endpoints
- [ ] **Performance tests** for blockchain operations

#### **📊 Code Quality:**
- [ ] **ESLint warnings** resolved
- [ ] **Secure logging** using `secureLogger` instead of `console.log`
- [ ] **Environment variables** documented in `.env.example`
- [ ] **TypeScript types** properly defined
- [ ] **Error boundaries** implemented for critical operations

#### **🚪 Emergency Bypass (USE SPARINGLY):**
If you need to bypass security checks in an emergency:
```bash
git commit -m "emergency fix: critical production issue" --no-verify
```
**⚠️ WARNING:** Only use `--no-verify` for actual emergencies. Document the reason and plan to fix security issues immediately after.

## 🔧 DEVELOPMENT.md UPDATES

When updating DEVELOPMENT.md or any documentation:
- Always maintain the attribution standards
- Update the "Latest Session Updates" section
- Include file modification details
- Reference the correct attribution format

## 🎯 PURPOSE

This attribution system ensures:
- Proper credit to mbxarts.com The Moon in a Box property
- Recognition of Godez22 as co-author
- Consistent branding across all commits
- Professional project ownership

## 📖 IMPLEMENTATION REMINDER

Every time you make a commit, remember:
1. **Write descriptive commit message** with clear feature/fix details
2. **Run security checks** via pre-commit hooks (automatic)
3. **ALWAYS** include the two attribution lines exactly as specified
4. **Never reference AI assistance** (Claude, Anthropic, etc.)
5. **Use exact wording** specified above for consistency

### **🎚️ Security Enforcement Levels**
The project uses graduated security enforcement:
- **Week 1-4:** `warning` level (issues logged but commits allowed)
- **Week 5+:** `error` level (critical issues block commits)
- **Always:** Sensitive data logging is blocked immediately

### **🔧 Troubleshooting Commit Issues**
If your commit is blocked:
1. **Check TypeScript errors:** `npm run type-check`
2. **Run tests:** `npm run test:ci`
3. **Check coverage:** `npm run test:coverage`
4. **Review security warnings** in hook output
5. **Emergency only:** Use `--no-verify` and fix issues immediately

### **📊 Monitoring Security Compliance**
- View `.security-config.json` for current enforcement levels
- Check GitHub Actions for CI security reports
- Use `npm run test:coverage` to track testing progress
- Review pre-commit hook output for improvement areas

This comprehensive system ensures both proper attribution AND bulletproof security for the CryptoGift Wallets project.