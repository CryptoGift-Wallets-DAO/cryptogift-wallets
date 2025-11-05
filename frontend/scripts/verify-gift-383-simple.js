/**
 * SIMPLE REDIS VERIFICATION FOR GIFT #383
 * Uses Upstash REST API (no dependencies needed)
 */

const https = require('https');

const REDIS_URL = 'https://exotic-alien-13383.upstash.io';
const REDIS_TOKEN = 'ATRHAAIncDE4Y2IyNzI0MmExMzY0Zjc2YTc1ZThkYjhkZDQ0ZjAzZXAxMTMzODM';

async function redisCommand(command, ...args) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify([command, ...args]);
    const url = new URL(REDIS_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.result);
        } catch (e) {
          reject(new Error(`Failed to parse: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('\n🔍 VERIFICANDO GIFT #383 (tokenId=359)\n');
  console.log('='.repeat(80));

  // Check gift:detail:383
  console.log('\n📊 Checking: gift:detail:383 (giftId key)');
  const giftIdData = await redisCommand('HGETALL', 'gift:detail:383');
  console.log('Raw response:', JSON.stringify(giftIdData, null, 2));

  if (Array.isArray(giftIdData) && giftIdData.length > 0) {
    console.log('\n✅ FOUND DATA - Converting array to object:');
    const obj = {};
    for (let i = 0; i < giftIdData.length; i += 2) {
      obj[giftIdData[i]] = giftIdData[i + 1];
    }

    console.log('\n📧 EMAIL FIELDS:');
    console.log('  - email_plain:', obj.email_plain || '❌ NOT FOUND');
    console.log('  - email_encrypted:', obj.email_encrypted ? `✅ EXISTS (length: ${obj.email_encrypted.length})` : '❌ NOT FOUND');
    console.log('  - email_hmac:', obj.email_hmac ? `✅ EXISTS (length: ${obj.email_hmac.length})` : '❌ NOT FOUND');
    console.log('  - email_captured_at:', obj.email_captured_at || '❌ NOT FOUND');

    console.log('\n📋 ALL FIELDS:');
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const display = typeof value === 'string' && value.length > 50
        ? value.substring(0, 50) + '...'
        : value;
      console.log(`  - ${key}: ${display}`);
    });
  } else {
    console.log('❌ NO DATA FOUND');
  }

  // Check gift:detail:359
  console.log('\n\n📊 Checking: gift:detail:359 (tokenId mirror key)');
  const tokenIdData = await redisCommand('HGETALL', 'gift:detail:359');
  console.log('Raw response:', JSON.stringify(tokenIdData, null, 2));

  if (Array.isArray(tokenIdData) && tokenIdData.length > 0) {
    console.log('\n✅ FOUND DATA - Converting array to object:');
    const obj = {};
    for (let i = 0; i < tokenIdData.length; i += 2) {
      obj[tokenIdData[i]] = tokenIdData[i + 1];
    }

    console.log('\n📧 EMAIL FIELDS:');
    console.log('  - email_plain:', obj.email_plain || '❌ NOT FOUND');
    console.log('  - email_encrypted:', obj.email_encrypted ? `✅ EXISTS (length: ${obj.email_encrypted.length})` : '❌ NOT FOUND');
    console.log('  - email_hmac:', obj.email_hmac ? `✅ EXISTS (length: ${obj.email_hmac.length})` : '❌ NOT FOUND');
  } else {
    console.log('❌ NO DATA FOUND');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ VERIFICATION COMPLETE\n');
}

main().catch(console.error);
