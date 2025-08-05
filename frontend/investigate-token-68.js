/**
 * INVESTIGACIÓN COMPLETA DEL TOKEN 68
 * Análisis detallado de Base Sepolia para detectar gaps en eventos
 */

const { ethers } = require('ethers');

// Configuration
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';
const NFT_CONTRACT_ADDRESS = '0xE9F316159a0830114252a96a6B7CA6efD874650F';
const ESCROW_CONTRACT_ADDRESS = '0x46175CfC233500DA803841DEef7f2816e7A129E0';
const SEARCH_FROM_BLOCK = 28915000; // V2 deployment block
const TOKEN_ID_TARGET = 68;

// Contract ABIs
const NFT_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function tokenByIndex(uint256 index) view returns (uint256)",
  "function exists(uint256 tokenId) view returns (bool)"
];

const ESCROW_ABI = [
  "event GiftRegisteredFromMint(uint256 indexed giftId, address indexed creator, address indexed nftContract, uint256 tokenId, uint40 expiresAt, address gate, string giftMessage, address registeredBy)"
];

/**
 * PASO 1: Verificar existencia del token 68 en el contrato NFT
 */
async function checkTokenExistence(provider) {
  console.log('\n🔍 PASO 1: Verificando existencia del token 68 en NFT contract...');
  console.log(`📍 Contract: ${NFT_CONTRACT_ADDRESS}`);
  
  const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, provider);
  
  try {
    // Check if token exists by trying to get its owner
    try {
      const owner = await nftContract.ownerOf(TOKEN_ID_TARGET);
      console.log(`✅ Token ${TOKEN_ID_TARGET} EXISTS`);
      console.log(`   Owner: ${owner}`);
      return { exists: true, owner };
    } catch (ownerError) {
      if (ownerError.message.includes('nonexistent') || ownerError.message.includes('invalid')) {
        console.log(`❌ Token ${TOKEN_ID_TARGET} DOES NOT EXIST`);
        return { exists: false, error: ownerError.message };
      }
      throw ownerError;
    }
    
  } catch (error) {
    console.error(`❌ Error checking token existence: ${error.message}`);
    return { exists: false, error: error.message };
  }
}

/**
 * PASO 2: Buscar eventos GiftRegisteredFromMint para tokenId 68
 */
async function searchSpecificTokenEvents(provider) {
  console.log('\n🔍 PASO 2: Buscando eventos GiftRegisteredFromMint para tokenId 68...');
  console.log(`📍 Escrow Contract: ${ESCROW_CONTRACT_ADDRESS}`);
  
  const iface = new ethers.Interface(ESCROW_ABI);
  const eventTopic = iface.getEvent('GiftRegisteredFromMint').topicHash;
  
  try {
    const currentBlock = await provider.getBlockNumber();
    console.log(`📦 Scanning blocks ${SEARCH_FROM_BLOCK} to ${currentBlock}`);
    
    // Scan in chunks to avoid RPC limits
    const chunkSize = 500;
    const allEvents = [];
    
    for (let fromBlock = SEARCH_FROM_BLOCK; fromBlock <= currentBlock; fromBlock += chunkSize) {
      const toBlock = Math.min(fromBlock + chunkSize - 1, currentBlock);
      
      try {
        const logs = await provider.getLogs({
          address: ESCROW_CONTRACT_ADDRESS,
          topics: [eventTopic],
          fromBlock,
          toBlock
        });
        
        for (const log of logs) {
          try {
            const parsed = iface.parseLog(log);
            const tokenId = Number(parsed.args.tokenId);
            const giftId = Number(parsed.args.giftId);
            
            allEvents.push({
              tokenId,
              giftId,
              creator: parsed.args.creator,
              nftContract: parsed.args.nftContract,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash
            });
            
            // Check if this is our target token
            if (tokenId === TOKEN_ID_TARGET) {
              console.log(`🎯 FOUND TOKEN ${TOKEN_ID_TARGET} EVENT!`);
              console.log(`   GiftId: ${giftId}`);
              console.log(`   Creator: ${parsed.args.creator}`);
              console.log(`   Block: ${log.blockNumber}`);
              console.log(`   Tx: ${log.transactionHash}`);
            }
            
          } catch (parseError) {
            // Skip invalid logs
          }
        }
        
        if (logs.length > 0) {
          console.log(`📦 Chunk ${fromBlock}-${toBlock}: Found ${logs.length} events`);
        }
        
      } catch (chunkError) {
        console.warn(`⚠️ Chunk ${fromBlock}-${toBlock} failed: ${chunkError.message}`);
      }
    }
    
    // Filter events for our target token
    const token68Events = allEvents.filter(e => e.tokenId === TOKEN_ID_TARGET);
    
    console.log(`\n📊 RESULTADOS ESPECÍFICOS PARA TOKEN ${TOKEN_ID_TARGET}:`);
    console.log(`   Eventos encontrados: ${token68Events.length}`);
    
    if (token68Events.length > 0) {
      token68Events.forEach((event, index) => {
        console.log(`   ${index + 1}. GiftId: ${event.giftId}, Block: ${event.blockNumber}`);
      });
    }
    
    return { events: token68Events, allEvents };
    
  } catch (error) {
    console.error(`❌ Error searching events: ${error.message}`);
    return { events: [], allEvents: [], error: error.message };
  }
}

/**
 * PASO 3: Analizar secuencia de eventos recientes
 */
async function analyzeRecentEvents(allEvents) {
  console.log('\n🔍 PASO 3: Analizando secuencia de eventos recientes...');
  
  if (!allEvents || allEvents.length === 0) {
    console.log('❌ No hay eventos para analizar');
    return;
  }
  
  // Sort events by tokenId
  const sortedEvents = allEvents.sort((a, b) => a.tokenId - b.tokenId);
  
  console.log(`📊 Total eventos encontrados: ${allEvents.length}`);
  console.log(`📊 Rango de tokenIds: ${sortedEvents[0].tokenId} - ${sortedEvents[sortedEvents.length - 1].tokenId}`);
  
  // Get last 20 events
  const recentEvents = allEvents
    .sort((a, b) => b.blockNumber - a.blockNumber)
    .slice(0, 20);
  
  console.log('\n📋 ÚLTIMOS 20 EVENTOS REGISTRADOS:');
  recentEvents.forEach((event, index) => {
    console.log(`   ${index + 1}. TokenId: ${event.tokenId}, GiftId: ${event.giftId}, Block: ${event.blockNumber}`);
  });
  
  // Analyze gaps around token 68
  const nearbyTokens = sortedEvents.filter(e => e.tokenId >= 60 && e.tokenId <= 80);
  
  console.log('\n📋 TOKENS CERCANOS AL 68 (rango 60-80):');
  if (nearbyTokens.length > 0) {
    nearbyTokens.forEach(event => {
      console.log(`   TokenId: ${event.tokenId}, GiftId: ${event.giftId}, Block: ${event.blockNumber}`);
    });
    
    // Check for gaps
    const tokenIds = nearbyTokens.map(e => e.tokenId).sort((a, b) => a - b);
    const gaps = [];
    
    for (let i = 1; i < tokenIds.length; i++) {
      if (tokenIds[i] - tokenIds[i-1] > 1) {
        for (let gap = tokenIds[i-1] + 1; gap < tokenIds[i]; gap++) {
          gaps.push(gap);
        }
      }
    }
    
    if (gaps.length > 0) {
      console.log(`\n⚠️ GAPS DETECTADOS EN SECUENCIA: ${gaps.join(', ')}`);
      if (gaps.includes(TOKEN_ID_TARGET)) {
        console.log(`🎯 TOKEN ${TOKEN_ID_TARGET} ESTÁ EN UN GAP!`);
      }
    } else {
      console.log('\n✅ No se detectaron gaps en la secuencia de tokens cercanos');
    }
  } else {
    console.log('   No hay tokens en el rango 60-80');
  }
}

/**
 * PASO 4: Verificar rango de bloques y mapeo giftId
 */
async function verifyBlockRangeAndMapping(allEvents) {
  console.log('\n🔍 PASO 4: Verificando rango de bloques y mapeo tokenId→giftId...');
  
  if (!allEvents || allEvents.length === 0) {
    console.log('❌ No hay eventos para analizar el mapeo');
    return;
  }
  
  // Analyze block distribution
  const blockNumbers = allEvents.map(e => e.blockNumber).sort((a, b) => a - b);
  const firstBlock = blockNumbers[0];
  const lastBlock = blockNumbers[blockNumbers.length - 1];
  
  console.log(`📦 Rango de bloques con eventos: ${firstBlock} - ${lastBlock}`);
  console.log(`📦 Bloques cubiertos: ${lastBlock - firstBlock + 1}`);
  console.log(`📦 Bloques de búsqueda: ${SEARCH_FROM_BLOCK} hacia adelante`);
  
  if (firstBlock < SEARCH_FROM_BLOCK) {
    console.log(`⚠️ ADVERTENCIA: Eventos encontrados antes del bloque de búsqueda ${SEARCH_FROM_BLOCK}`);
  }
  
  // Analyze tokenId→giftId mapping
  console.log('\n📋 ANÁLISIS DE MAPEO tokenId → giftId:');
  
  const mappings = allEvents.map(e => ({ tokenId: e.tokenId, giftId: e.giftId }))
    .sort((a, b) => a.tokenId - b.tokenId);
  
  console.log('   TokenId | GiftId | Diferencia');
  console.log('   --------|--------|----------');
  
  mappings.forEach((mapping, index) => {
    const diff = mapping.giftId - mapping.tokenId;
    const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;
    console.log(`   ${mapping.tokenId.toString().padStart(7)} | ${mapping.giftId.toString().padStart(6)} | ${diffStr.padStart(8)}`);
  });
  
  // Check for inconsistencies
  const differences = mappings.map(m => m.giftId - m.tokenId);
  const uniqueDiffs = [...new Set(differences)];
  
  if (uniqueDiffs.length === 1) {
    console.log(`\n✅ Mapeo consistente: giftId = tokenId ${uniqueDiffs[0] >= 0 ? '+' : ''}${uniqueDiffs[0]}`);
  } else {
    console.log(`\n⚠️ Mapeo inconsistente: ${uniqueDiffs.length} patrones diferentes`);
    console.log(`   Diferencias encontradas: ${uniqueDiffs.join(', ')}`);
  }
}

/**
 * PASO 5: Generar informe final
 */
function generateFinalReport(tokenExistence, token68Events, allEvents, gaps) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 INFORME FINAL DE INVESTIGACIÓN - TOKEN 68');
  console.log('='.repeat(80));
  
  console.log('\n🔍 1. EXISTENCIA EN CONTRATO NFT:');
  if (tokenExistence.exists) {
    console.log(`   ✅ Token 68 EXISTE en el contrato NFT`);
    console.log(`   📍 Owner: ${tokenExistence.owner}`);
  } else {
    console.log(`   ❌ Token 68 NO EXISTE en el contrato NFT`);
    console.log(`   📍 Error: ${tokenExistence.error}`);
  }
  
  console.log('\n🔍 2. EVENTOS EN ESCROW:');
  if (token68Events && token68Events.length > 0) {
    console.log(`   ✅ Token 68 tiene ${token68Events.length} evento(s) GiftRegisteredFromMint`);
    token68Events.forEach((event, index) => {
      console.log(`   ${index + 1}. GiftId: ${event.giftId}, Block: ${event.blockNumber}, Tx: ${event.txHash}`);
    });
  } else {
    console.log(`   ❌ Token 68 NO tiene eventos GiftRegisteredFromMint registrados`);
  }
  
  console.log('\n🔍 3. ESTADÍSTICAS GENERALES:');
  if (allEvents && allEvents.length > 0) {
    const sortedEvents = allEvents.sort((a, b) => a.tokenId - b.tokenId);
    const lastToken = sortedEvents[sortedEvents.length - 1];
    
    console.log(`   📊 Total eventos encontrados: ${allEvents.length}`);
    console.log(`   📊 Último token registrado: ${lastToken.tokenId} (GiftId: ${lastToken.giftId})`);
    console.log(`   📊 Rango de tokens: ${sortedEvents[0].tokenId} - ${lastToken.tokenId}`);
    
    // Check if token 68 should exist based on sequence
    const token68Expected = sortedEvents[0].tokenId <= TOKEN_ID_TARGET && lastToken.tokenId >= TOKEN_ID_TARGET;
    
    if (token68Expected) {
      console.log(`   ⚠️ Token 68 debería estar registrado según la secuencia`);
    } else {
      console.log(`   ℹ️ Token 68 está fuera del rango de tokens registrados`);
    }
  }
  
  console.log('\n🔍 4. DIAGNÓSTICO:');
  
  if (tokenExistence.exists && (!token68Events || token68Events.length === 0)) {
    console.log(`   🚨 PROBLEMA DETECTADO: Token 68 existe pero no está registrado en escrow`);
    console.log(`   📝 Posibles causas:`);
    console.log(`      - Token fue mintado pero nunca registrado en escrow`);
    console.log(`      - Evento fuera del rango de bloques de búsqueda`);
    console.log(`      - Error en la transacción de registro`);
    console.log(`      - Gap en la secuencia de eventos`);
  } else if (!tokenExistence.exists && token68Events && token68Events.length > 0) {
    console.log(`   🚨 INCONSISTENCIA: Evento registrado pero token no existe`);
    console.log(`   📝 Esto indica un problema serio en el contrato o datos`);
  } else if (!tokenExistence.exists && (!token68Events || token68Events.length === 0)) {
    console.log(`   ✅ CONSISTENTE: Token 68 no existe y no hay eventos registrados`);
  } else {
    console.log(`   ✅ CONSISTENTE: Token 68 existe y está registrado correctamente`);
  }
  
  console.log('\n🔍 5. RECOMENDACIONES:');
  console.log(`   1. Verificar el owner del token 68 si existe`);
  console.log(`   2. Revisar transacciones de mint del token 68`);
  console.log(`   3. Expandir búsqueda a bloques anteriores si es necesario`);
  console.log(`   4. Verificar estado del contrato escrow`);
  console.log(`   5. Comprobar si hay transacciones fallidas relacionadas`);
  
  console.log('\n' + '='.repeat(80));
}

/**
 * FUNCIÓN PRINCIPAL
 */
async function investigateToken68() {
  console.log('🔍 INICIANDO INVESTIGACIÓN COMPLETA DEL TOKEN 68');
  console.log('📍 Network: Base Sepolia');
  console.log(`📍 NFT Contract: ${NFT_CONTRACT_ADDRESS}`);
  console.log(`📍 Escrow Contract: ${ESCROW_CONTRACT_ADDRESS}`);
  console.log(`📍 Target Token: ${TOKEN_ID_TARGET}`);
  
  try {
    // Initialize provider
    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    
    // Test connection
    const network = await provider.getNetwork();
    console.log(`✅ Connected to ${network.name} (chainId: ${network.chainId})`);
    
    // Execute investigation steps
    const tokenExistence = await checkTokenExistence(provider);
    const { events: token68Events, allEvents } = await searchSpecificTokenEvents(provider);
    
    await analyzeRecentEvents(allEvents);
    await verifyBlockRangeAndMapping(allEvents);
    
    // Generate final report
    generateFinalReport(tokenExistence, token68Events, allEvents);
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR during investigation:', error);
    console.log('\n📋 ERROR REPORT:');
    console.log(`   Message: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Execute investigation
if (require.main === module) {
  investigateToken68().catch(console.error);
}

module.exports = {
  investigateToken68,
  checkTokenExistence,
  searchSpecificTokenEvents,
  analyzeRecentEvents,
  verifyBlockRangeAndMapping
};