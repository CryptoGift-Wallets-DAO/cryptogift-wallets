// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IGate Interface
 * @dev Interface for modular gate system in GiftEscrow
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */
interface IGate {
    /**
     * @dev Verifies if the claimer can claim the gift
     * @param claimer Address that intends to claim
     * @param giftId ID of the gift being claimed
     * @param data Arbitrary data for gate verification
     * @return ok True if claimer can proceed
     * @return reason Human-readable reason for the result
     */
    function check(
        address claimer,
        uint256 giftId,
        bytes calldata data
    ) external view returns (bool ok, string memory reason);
    
    /**
     * @dev Returns description of gate requirements
     * @return Human-readable requirements description
     */
    function getRequirements() external view returns (string memory);
    
    /**
     * @dev Indicates if the gate is currently active
     * @return True if gate is active and accepting verifications
     */
    function isActive() external view returns (bool);
}