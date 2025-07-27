// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/**
 * @title ERC2771ForwarderStandard
 * @dev Standard OpenZeppelin ERC2771Forwarder for meta-transactions
 * Deployed for CryptoGift NFT-Wallet V2 Zero-Custody Architecture
 */
contract ERC2771ForwarderStandard is ERC2771Forwarder {
    constructor() ERC2771Forwarder() {}
}