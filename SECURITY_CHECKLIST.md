# 🛡️ SECURITY & TESTING CHECKLIST - CRYPTOGIFT WALLETS

## OBLIGATORIO PARA CADA NUEVA FEATURE

### ✅ **TESTING REQUIREMENTS (CRÍTICO)**
- [ ] **Unit tests** creados en `src/test/[feature].test.ts`
- [ ] **Coverage mínimo 70%** verificado con `npm run test:coverage`
- [ ] **Edge cases** probados (valores 0, null, undefined, overflow)
- [ ] **Error handling** probado (network failures, invalid inputs)
- [ ] **Blockchain operations** mockeados correctamente

### ✅ **SECURITY REQUIREMENTS (CRÍTICO)**

#### **API Endpoints:**
- [ ] **Rate limiting** implementado con `checkRateLimit(address)`
- [ ] **Authentication** verificado con `verifyJWT()` si aplica
- [ ] **Input validation** con tipos TypeScript estrictos
- [ ] **Error messages** no exponen información sensible
- [ ] **CORS** configurado apropiadamente

#### **Logging & Monitoring:**
- [ ] **Secure logging** usando `secureLogger.info/warn/error`
- [ ] **No sensitive data** en logs (private keys, tokens, passwords)
- [ ] **User actions** loggeados para auditoría
- [ ] **Performance metrics** capturados si aplica

#### **Blockchain Operations:**
- [ ] **Gas estimation** implementado correctamente
- [ ] **Transaction validation** antes de submission
- [ ] **Receipt verification** después de mining
- [ ] **Error recovery** para failed transactions
- [ ] **TokenId validation** (prevent tokenId=0)

#### **Data Persistence:**
- [ ] **Redis/KV storage** para data crítica
- [ ] **Data expiration** configurado donde aplique
- [ ] **Backup strategy** considerado
- [ ] **Data sanitization** antes de storage

### ✅ **ENVIRONMENT & CONFIG**
- [ ] **Environment variables** documentadas en `.env.example`
- [ ] **Required secrets** validados en `envValidator.ts`
- [ ] **Feature flags** implementados si es experimental
- [ ] **Rollback plan** definido para production

### ✅ **PRODUCTION READINESS**
- [ ] **TypeScript compilation** sin errores (`npm run type-check`)
- [ ] **ESLint warnings** resueltas (`npm run lint`)
- [ ] **Build successful** localmente (`npm run build`)
- [ ] **Tests passing** (`npm run test:ci`)
- [ ] **Performance impact** evaluado

## 🚨 **CRITICAL SECURITY PATTERNS**

### **Always Use These Patterns:**

```typescript
// ✅ SECURE API ENDPOINT TEMPLATE
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. Rate limiting
    const rateLimit = await checkRateLimit(userAddress);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // 2. Authentication (if needed)
    const user = await verifyJWT(req.headers.authorization);
    
    // 3. Input validation
    const { amount, recipient } = req.body;
    if (!amount || !isValidEthereumAddress(recipient)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    // 4. Secure logging
    secureLogger.info('Operation started', { 
      userAddress: user.address,
      operation: 'payment',
      // NO sensitive data here
    });

    // 5. Business logic with error handling
    const result = await performOperation(amount, recipient);

    // 6. Success response
    secureLogger.info('Operation completed', { 
      userAddress: user.address,
      success: true 
    });
    
    return res.status(200).json({ success: true, result });

  } catch (error) {
    // 7. Error logging (sanitized)
    secureLogger.error('Operation failed', { 
      error: error.message,
      // NO sensitive data in error logs
    });
    
    return res.status(500).json({ 
      error: 'Internal server error' // Generic message to user
    });
  }
}
```

### **Always Create Tests:**

```typescript
// ✅ TEST TEMPLATE FOR NEW FEATURES
describe('NewFeature', () => {
  test('Should handle valid input correctly', () => {
    // Test happy path
  });

  test('Should reject invalid input', () => {
    // Test validation
  });

  test('Should handle rate limiting', () => {
    // Test rate limits
  });

  test('Should handle errors gracefully', () => {
    // Test error scenarios
  });

  test('Should not expose sensitive data', () => {
    // Test data sanitization
  });
});
```

## 🎯 **ENFORCEMENT STRATEGY**

### **Pre-Commit Hooks (Recommended)**
- TypeScript compilation check
- ESLint validation
- Test execution
- Security pattern validation

### **CI/CD Pipeline Checks**
- All tests must pass
- Coverage threshold must be met (70%)
- Security scan passed
- Build successful

### **Code Review Requirements**
- Security checklist verified
- Tests reviewed and approved
- Performance impact assessed
- Documentation updated

## 📊 **METRICS TO TRACK**

- Test coverage percentage
- API response times
- Error rates by endpoint
- Security incidents count
- Failed authentication attempts

---

**⚠️ IMPORTANT:** This checklist must be followed for EVERY new feature, endpoint, or significant code change. Security is not optional - it's mandatory for financial applications handling real user funds.