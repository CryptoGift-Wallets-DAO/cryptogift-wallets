# Archive - Contratos Descartados

Este directorio contiene versiones antiguas y simplificadas de contratos que fueron descartadas durante el proceso de desarrollo.

## Archivos:

### `GiftEscrowDeploy.sol` - DESCARTADO
- **Razón**: Versión mínima creada para esquivar errores de herencia múltiple
- **Problema**: Perdió funcionalidades enterprise críticas (IGate, anti-brute force, paymaster)
- **Estado**: Fue desplegada temporalmente pero reemplazada por versión enterprise

### `GiftEscrow-original.sol` - DESCARTADO  
- **Razón**: Errores de linearización de herencia múltiple
- **Problema**: "Linearization of inheritance graph impossible"
- **Estado**: Versión inicial con funcionalidades completas pero errores de compilación

### `GiftEscrowSimple.sol` - DESCARTADO
- **Razón**: Intento intermedio de solucionar herencia
- **Problema**: Aún tenía conflictos de herencia múltiple
- **Estado**: Versión intermedia abandonada

### `DeploySimple.s.sol` - DESCARTADO
- **Razón**: Script para contrato mínimo descartado
- **Estado**: Reemplazado por DeployEnterprise.s.sol

## Contrato Actual:
- **`GiftEscrowEnterprise.sol`** - Versión final con todas las funcionalidades enterprise
- **Script**: `DeployEnterprise.s.sol`

## Lecciones Aprendidas:
1. Orden correcto de herencia múltiple en Solidity
2. Necesidad de overrides explícitos para _contextSuffixLength 
3. Importancia de via_ir para contratos complejos
4. **CRÍTICO**: Nunca exponer claves privadas en logs o documentación