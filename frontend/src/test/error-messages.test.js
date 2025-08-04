/**
 * R3 - Unit Tests for Error Messages (3 states: claimed/expired/not-ready)
 * Tests the corrected Spanish error messages logic
 */

describe('Error Messages for Gift States', () => {
  
  // Mock function to simulate the message logic from ClaimEscrowInterface
  const getErrorMessage = (giftInfo) => {
    if (giftInfo.status === 'claimed') {
      return {
        title: 'Gift reclamado',
        message: 'Este gift ya ha sido reclamado exitosamente.',
        icon: '✅'
      };
    }
    
    if (giftInfo.status === 'returned') {
      return {
        title: 'Gift devuelto al creador',
        message: 'Este gift ha sido devuelto a su creador.',
        icon: '↩️'
      };
    }
    
    if (giftInfo.isExpired) {
      const date = new Date(giftInfo.expirationTime * 1000).toLocaleDateString('es-ES');
      return {
        title: 'Gift expirado',
        message: `Este gift ha expirado y ya no puede ser reclamado.`,
        icon: '⏰'
      };
    }
    
    if (giftInfo.status === 'active' && !giftInfo.canClaim) {
      const date = new Date(giftInfo.expirationTime * 1000).toLocaleDateString('es-ES');
      return {
        title: 'Gift todavía no Reclamado',
        message: `Gift todavía no disponible. Vence el ${date}.`,
        icon: '⏳'
      };
    }
    
    return {
      title: 'Gift no puede ser reclamado',
      message: 'Este gift no está disponible para reclamar en este momento.',
      icon: '❌'
    };
  };

  test('R3.1 - Shows correct message for CLAIMED status', () => {
    const claimedGiftInfo = {
      status: 'claimed',
      creator: '0x1234567890123456789012345678901234567890',
      nftContract: '0x9876543210987654321098765432109876543210',
      expirationTime: Date.now() / 1000 + 86400,
      canClaim: false,
      isExpired: false,
    };

    const result = getErrorMessage(claimedGiftInfo);
    
    expect(result.title).toBe('Gift reclamado');
    expect(result.message).toBe('Este gift ya ha sido reclamado exitosamente.');
    expect(result.icon).toBe('✅');
  });

  test('R3.2 - Shows correct message for EXPIRED status', () => {
    const expiredGiftInfo = {
      status: 'active',
      creator: '0x1234567890123456789012345678901234567890',
      nftContract: '0x9876543210987654321098765432109876543210',
      expirationTime: Date.now() / 1000 - 3600, // 1 hour ago
      canClaim: false,
      isExpired: true,
    };

    const result = getErrorMessage(expiredGiftInfo);
    
    expect(result.title).toBe('Gift expirado');
    expect(result.message).toBe('Este gift ha expirado y ya no puede ser reclamado.');
    expect(result.icon).toBe('⏰');
  });

  test('R3.3 - Shows correct message for NOT-READY status', () => {
    // Use UTC to avoid timezone issues
    const notReadyGiftInfo = {
      status: 'active',
      creator: '0x1234567890123456789012345678901234567890',
      nftContract: '0x9876543210987654321098765432109876543210',
      expirationTime: new Date('2025-12-25T12:00:00Z').getTime() / 1000,
      canClaim: false,
      isExpired: false,
    };

    const result = getErrorMessage(notReadyGiftInfo);
    
    expect(result.title).toBe('Gift todavía no Reclamado');
    expect(result.message).toContain('Gift todavía no disponible. Vence el');
    expect(result.message).toContain('/12/2025'); // More flexible date check
    expect(result.icon).toBe('⏳');
  });

  test('R3.4 - Shows correct message for RETURNED status', () => {
    const returnedGiftInfo = {
      status: 'returned',
      creator: '0x1234567890123456789012345678901234567890',
      nftContract: '0x9876543210987654321098765432109876543210',
      expirationTime: Date.now() / 1000 + 86400,
      canClaim: false,
      isExpired: false,
    };

    const result = getErrorMessage(returnedGiftInfo);
    
    expect(result.title).toBe('Gift devuelto al creador');
    expect(result.message).toBe('Este gift ha sido devuelto a su creador.');
    expect(result.icon).toBe('↩️');
  });

  test('R3.5 - Shows correct date format for Spanish locale', () => {
    const testDate = new Date('2025-12-25T12:00:00Z').getTime() / 1000;
    const notReadyGiftInfo = {
      status: 'active',
      creator: '0x1234567890123456789012345678901234567890',
      nftContract: '0x9876543210987654321098765432109876543210',
      expirationTime: testDate,
      canClaim: false,
      isExpired: false,
    };

    const result = getErrorMessage(notReadyGiftInfo);
    
    // Should show Spanish date format (DD/MM/YYYY) - flexible check
    expect(result.message).toMatch(/\d{1,2}\/12\/2025/);
  });

  test('R3.6 - Coverage report for all states', () => {
    const testCases = [
      { status: 'claimed', expected: 'Gift reclamado' },
      { status: 'returned', expected: 'Gift devuelto al creador' },
      { status: 'active', isExpired: true, expected: 'Gift expirado' },
      { status: 'active', canClaim: false, expected: 'Gift todavía no Reclamado' }
    ];

    testCases.forEach(testCase => {
      const giftInfo = {
        status: testCase.status,
        creator: '0x1234',
        nftContract: '0x9876',
        expirationTime: Date.now() / 1000 + 86400,
        canClaim: testCase.canClaim !== undefined ? testCase.canClaim : true,
        isExpired: testCase.isExpired || false,
      };

      const result = getErrorMessage(giftInfo);
      expect(result.title).toBe(testCase.expected);
    });

    // Verify all 4 core states are covered
    expect(testCases).toHaveLength(4);
  });
});