// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IGate.sol";

/**
 * @title SimpleApprovalGate
 * @dev Ultra-lightweight gate for education requirements
 * @notice Uses minimal gas (<30k) with read-only operations
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */
contract SimpleApprovalGate is IGate {
    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    /// @notice Compact approval mapping: keccak256(giftId, claimer) → approved
    mapping(bytes32 => bool) public approvals;
    
    /// @notice Optional: Education level per address (for general credentials)
    mapping(address => uint8) public educationLevel;
    
    /// @notice Requirements version for invalidating old credentials
    uint16 public constant REQUIREMENTS_VERSION = 1;
    
    /// @notice Maximum gas allowed for check function
    uint256 private constant MAX_GAS = 45000;
    
    /// @notice Admin who can grant approvals
    address public immutable approver;
    
    /// @notice Optional: Address of SBT/Attestation contract for credential checks
    address public credentialContract;
    
    // =============================================================================
    // EIP-712 DOMAIN SEPARATOR
    // =============================================================================
    
    /// @notice EIP-712 Domain Separator for signature verification
    bytes32 public immutable DOMAIN_SEPARATOR;
    
    /// @notice EIP-712 typehash for approval signatures
    bytes32 public constant APPROVAL_TYPEHASH = keccak256(
        "EducationApproval(address claimer,uint256 giftId,uint16 requirementsVersion,uint256 deadline,uint256 chainId,address verifyingContract)"
    );
    
    // =============================================================================
    // ERROR CODES (Gas-efficient)
    // =============================================================================
    
    uint8 private constant OK = 0;
    uint8 private constant EDUCATION_REQUIRED = 1;
    uint8 private constant INVALID_CREDENTIAL = 2;
    uint8 private constant GATE_INACTIVE = 3;
    
    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event ApprovalGranted(uint256 indexed giftId, address indexed claimer, uint256 timestamp);
    event EducationLevelUpdated(address indexed user, uint8 newLevel);
    event CredentialContractUpdated(address indexed newContract);
    
    // =============================================================================
    // MODIFIERS
    // =============================================================================
    
    modifier onlyApprover() {
        require(msg.sender == approver, "Not approver");
        _;
    }
    
    modifier gasProtected() {
        uint256 gasStart = gasleft();
        _;
        require(gasStart - gasleft() < MAX_GAS, "GateGasExceeded");
    }
    
    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    constructor(address _approver) {
        require(_approver != address(0), "Invalid approver");
        approver = _approver;
        
        // Initialize EIP-712 domain separator
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("SimpleApprovalGate"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }
    
    // =============================================================================
    // CORE GATE FUNCTIONS (IGate Implementation)
    // =============================================================================
    
    /**
     * @dev Check if claimer can proceed with gift claim
     * @param claimer Address attempting to claim
     * @param giftId ID of the gift being claimed
     * @param data Optional data (can contain signature, education level, etc.)
     * @return ok True if claimer is approved
     * @return reason Compact error code or success message
     */
    function check(
        address claimer,
        uint256 giftId,
        bytes calldata data
    ) external view override gasProtected returns (bool ok, string memory reason) {
        // Option A: EIP-712 Signature Verification (Primary Route - Stateless)
        if (data.length >= 97) { // 65 bytes signature + 32 bytes deadline minimum
            // Extract signature components (v, r, s) and deadline
            bytes memory signature = data[0:65];
            uint256 deadline = abi.decode(data[65:97], (uint256));
            
            // Check deadline
            if (block.timestamp <= deadline) {
                // Reconstruct the digest
                bytes32 structHash = keccak256(
                    abi.encode(
                        APPROVAL_TYPEHASH,
                        claimer,
                        giftId,
                        REQUIREMENTS_VERSION,
                        deadline,
                        block.chainid,
                        address(this)
                    )
                );
                
                bytes32 digest = keccak256(
                    abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
                );
                
                // Recover signer
                address signer = recoverSigner(digest, signature);
                
                // Verify signer is the approver
                if (signer == approver) {
                    return (true, "0"); // Signature valid - approved
                }
            }
            // Signature invalid or expired - continue to other options
        }
        
        // Option B: Check specific approval mapping (Override/Fallback)
        bytes32 approvalKey = keccak256(abi.encodePacked(giftId, claimer));
        if (approvals[approvalKey]) {
            return (true, "0"); // Code for OK
        }
        
        // Option C: Check general education level if data provided
        if (data.length >= 32 && data.length < 97) {
            uint8 requiredLevel = uint8(bytes1(data[0]));
            if (requiredLevel > 0 && educationLevel[claimer] >= requiredLevel) {
                return (true, "0"); // Code for OK
            }
        }
        
        // Option D: Check external credential (SBT/Attestation) if configured
        if (credentialContract != address(0)) {
            // Simplified check - assumes credential contract has balanceOf or similar
            (bool success, bytes memory result) = credentialContract.staticcall{gas: 10000}(
                abi.encodeWithSignature("balanceOf(address)", claimer)
            );
            
            if (success && result.length >= 32) {
                uint256 balance = abi.decode(result, (uint256));
                if (balance > 0) {
                    return (true, "0"); // Has credential
                }
            }
        }
        
        // Not approved - return error code
        return (false, "1"); // EDUCATION_REQUIRED
    }
    
    /**
     * @dev Get requirements description (returns compact JSON as bytes)
     * @return Encoded requirements data
     */
    function getRequirements() external pure override returns (string memory) {
        // Return compact JSON with module IDs
        // Frontend will decode and show proper localized descriptions
        // Example: {"v":1,"m":[1,2,3]} = Version 1, Modules 1,2,3
        return '{"v":1,"m":[1,2]}'; // Basic wallet + Security modules
    }
    
    /**
     * @dev Check if gate is currently active
     * @return True if gate is operational
     */
    function isActive() external pure override returns (bool) {
        return true; // Always active in this simple implementation
    }
    
    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Grant approval for a specific gift+claimer combination
     * @param giftId The gift ID
     * @param claimer The address to approve
     */
    function grantApproval(uint256 giftId, address claimer) external onlyApprover {
        bytes32 key = keccak256(abi.encodePacked(giftId, claimer));
        approvals[key] = true;
        emit ApprovalGranted(giftId, claimer, block.timestamp);
    }
    
    /**
     * @dev Batch grant approvals for efficiency
     * @param giftIds Array of gift IDs
     * @param claimers Array of claimer addresses
     */
    function batchGrantApprovals(
        uint256[] calldata giftIds,
        address[] calldata claimers
    ) external onlyApprover {
        require(giftIds.length == claimers.length, "Length mismatch");
        
        for (uint256 i = 0; i < giftIds.length; i++) {
            bytes32 key = keccak256(abi.encodePacked(giftIds[i], claimers[i]));
            approvals[key] = true;
            emit ApprovalGranted(giftIds[i], claimers[i], block.timestamp);
        }
    }
    
    /**
     * @dev Update education level for a user (for general credentials)
     * @param user The user address
     * @param level The education level achieved
     */
    function updateEducationLevel(address user, uint8 level) external onlyApprover {
        educationLevel[user] = level;
        emit EducationLevelUpdated(user, level);
    }
    
    /**
     * @dev Set external credential contract address (SBT/Attestation)
     * @param _credentialContract Address of the credential contract
     */
    function setCredentialContract(address _credentialContract) external onlyApprover {
        credentialContract = _credentialContract;
        emit CredentialContractUpdated(_credentialContract);
    }
    
    /**
     * @dev Revoke approval if needed (security feature)
     * @param giftId The gift ID
     * @param claimer The address to revoke
     */
    function revokeApproval(uint256 giftId, address claimer) external onlyApprover {
        bytes32 key = keccak256(abi.encodePacked(giftId, claimer));
        delete approvals[key];
    }
    
    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Check if a specific gift+claimer is approved
     * @param giftId The gift ID
     * @param claimer The claimer address
     * @return Whether the combination is approved
     */
    function isApproved(uint256 giftId, address claimer) external view returns (bool) {
        bytes32 key = keccak256(abi.encodePacked(giftId, claimer));
        return approvals[key];
    }
    
    /**
     * @dev Get education level of a user
     * @param user The user address
     * @return The education level
     */
    function getEducationLevel(address user) external view returns (uint8) {
        return educationLevel[user];
    }
    
    /**
     * @dev Decode error code to human-readable message (for debugging)
     * @param code The error code
     * @return The error message
     */
    function decodeError(uint8 code) external pure returns (string memory) {
        if (code == 0) return "OK";
        if (code == 1) return "EDUCATION_REQUIRED";
        if (code == 2) return "INVALID_CREDENTIAL";
        if (code == 3) return "GATE_INACTIVE";
        return "UNKNOWN_ERROR";
    }
    
    // =============================================================================
    // INTERNAL FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Recover signer address from signature
     * @param digest The message digest
     * @param signature The signature bytes (65 bytes: r + s + v)
     * @return The recovered signer address
     */
    function recoverSigner(bytes32 digest, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }
        
        // EIP-2 adjustment
        if (v < 27) {
            v += 27;
        }
        
        require(v == 27 || v == 28, "Invalid signature v value");
        
        return ecrecover(digest, v, r, s);
    }
}