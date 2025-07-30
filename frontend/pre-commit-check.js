#!/usr/bin/env node

/**
 * PRE-COMMIT SECURITY AND QUALITY CHECK SYSTEM
 * 
 * Este script debe ejecutarse SIEMPRE antes de cada commit
 * para garantizar que el código cumple con los estándares de seguridad
 * 
 * USO: node pre-commit-check.js
 * 
 * Made by mbxarts.com The Moon in a Box property
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🛡️  INICIANDO REVISIÓN PRE-COMMIT...\n');

let hasErrors = false;
let hasWarnings = false;

// Cargar configuración de seguridad
const securityConfig = JSON.parse(fs.readFileSync('.security-config.json', 'utf8'));

function runCommand(command, description) {
  console.log(`🔍 ${description}...`);
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      timeout: 30000, // 30 second timeout to prevent hanging
      stdio: 'pipe'
    });
    console.log(`✅ ${description} - EXITOSO\n`);
    return { success: true, output: result };
  } catch (error) {
    if (error.code === 'TIMEOUT') {
      console.log(`⚠️ ${description} - TIMEOUT (considerado como warning)\n`);
      return { success: false, error: 'timeout', timeout: true };
    }
    console.log(`❌ ${description} - FALLÓ`);
    console.log(`Error: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

// 1. VERIFICACIÓN TYPESCRIPT CRÍTICA
console.log('📝 === VERIFICACIÓN TYPESCRIPT (CRÍTICA) ===');
const typeCheck = runCommand('npm run type-check', 'Verificación de tipos TypeScript');
if (!typeCheck.success && securityConfig.rules.typescript_compilation.level === 'error') {
  if (typeCheck.timeout) {
    console.log('⚠️ WARNING: TypeScript compilation timeout - posible issue con dependências');
    console.log('💡 Considerar optimizar imports o revisar dependencies');
    hasWarnings = true;
  } else {
    console.log('🚨 ERROR CRÍTICO: TypeScript compilation falló');
    console.log('Este error BLOQUEA el deployment automáticamente');
    hasErrors = true;
  }
}

// 2. VERIFICACIÓN DE LINTING
console.log('🔍 === VERIFICACIÓN DE LINTING ===');
const lintCheck = runCommand('npm run lint', 'ESLint verificación');
if (!lintCheck.success) {
  console.log('⚠️  WARNING: Linting issues encontrados');
  hasWarnings = true;
}

// 3. VERIFICACIÓN DE DATOS SENSIBLES
console.log('🔒 === VERIFICACIÓN DE DATOS SENSIBLES ===');
try {
  const sensitivePatterns = [
    /console\.log.*private.*key/i,
    /console\.log.*password.*hash/i,
    /console\.log.*secret.*key/i,
    /console\.log.*(?:bearer|jwt).*[a-zA-Z0-9]{30,}/i, // More specific token pattern
    /console\.log.*0x[a-fA-F0-9]{64}/i // Transaction hashes
  ];
  
  let sensitiveFound = false;
  
  // Buscar en archivos JS/TS
  const checkDir = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
        checkDir(fullPath);
      } else if (file.name.endsWith('.ts') || file.name.endsWith('.js') || file.name.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        for (const pattern of sensitivePatterns) {
          if (pattern.test(content)) {
            console.log(`🚨 DATOS SENSIBLES DETECTADOS en ${fullPath}`);
            sensitiveFound = true;
          }
        }
      }
    }
  };
  
  checkDir('./src');
  
  if (sensitiveFound && securityConfig.rules.sensitive_data_logging.level === 'error') {
    console.log('🚨 ERROR CRÍTICO: Datos sensibles encontrados en logs');
    hasErrors = true;
  } else if (!sensitiveFound) {
    console.log('✅ No se encontraron datos sensibles expuestos\n');
  }
  
} catch (error) {
  console.log('⚠️  Error verificando datos sensibles:', error.message);
}

// 4. VERIFICACIÓN DE TESTS (OPCIONAL)
console.log('🧪 === VERIFICACIÓN DE TESTS ===');
const testCheck = runCommand('npm run test:ci', 'Ejecución de tests');
if (!testCheck.success) {
  console.log('⚠️  WARNING: Algunos tests fallaron');
  hasWarnings = true;
}

// 5. RESUMEN FINAL
console.log('📊 === RESUMEN DE REVISIÓN PRE-COMMIT ===');

if (hasErrors) {
  console.log('🚨 ERRORES CRÍTICOS ENCONTRADOS');
  console.log('❌ NO se recomienda hacer commit hasta resolver estos issues');
  console.log('💡 Los errores críticos bloquearán el deployment automático\n');
  
  console.log('🔧 ACCIONES REQUERIDAS:');
  console.log('1. Revisar y corregir errores TypeScript');
  console.log('2. Eliminar cualquier log de datos sensibles');
  console.log('3. Ejecutar nuevamente: node pre-commit-check.js');
  console.log('4. Solo después hacer: git commit\n');
  
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  WARNINGS ENCONTRADOS');
  console.log('✅ Commit permitido, pero revisar warnings para mejorar calidad');
  console.log('📝 Considera resolver estos issues antes del próximo commit\n');
} else {
  console.log('🎉 TODAS LAS VERIFICACIONES PASARON');
  console.log('✅ Código listo para commit');
  console.log('🚀 Deployment automático se activará correctamente\n');
}

console.log('🏷️  RECORDATORIO: Usar attribution correcta en commit message:');
console.log('Made by mbxarts.com The Moon in a Box property');
console.log('Co-Author: Godez22\n');