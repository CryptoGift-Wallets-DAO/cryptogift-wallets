// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CryptoGiftNFT
 * @dev Simple NFT contract for CryptoGift platform
 * Supports ERC-6551 Token Bound Accounts
 */
contract CryptoGiftNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    
    // Events
    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
    
    constructor(address initialOwner) 
        ERC721("CryptoGift NFT-Wallets", "CGNFT") 
        Ownable(initialOwner) 
    {
        _tokenIdCounter = 1; // Start from token ID 1
    }
    
    /**
     * @dev Mint NFT to specified address with metadata URI
     * @param to Address to mint NFT to
     * @param uri Metadata URI for the NFT
     * @return tokenId The ID of the minted token
     */
    function mintTo(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit NFTMinted(to, tokenId, uri);
        return tokenId;
    }
    
    /**
     * @dev Mint NFT with custom token ID (for compatibility)
     * @param to Address to mint NFT to
     * @param tokenId Custom token ID
     * @param uri Metadata URI for the NFT
     */
    function mintWithTokenId(address to, uint256 tokenId, string memory uri) public onlyOwner {
        require(_ownerOf(tokenId) == address(0), "Token ID already exists");
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit NFTMinted(to, tokenId, uri);
    }
    
    /**
     * @dev Batch mint multiple NFTs (for efficiency)
     * @param to Address to mint NFTs to
     * @param uris Array of metadata URIs
     * @return tokenIds Array of minted token IDs
     */
    function batchMint(address to, string[] memory uris) public onlyOwner returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](uris.length);
        
        for (uint256 i = 0; i < uris.length; i++) {
            uint256 tokenId = _tokenIdCounter++;
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, uris[i]);
            tokenIds[i] = tokenId;
            
            emit NFTMinted(to, tokenId, uris[i]);
        }
        
        return tokenIds;
    }
    
    /**
     * @dev Get current token counter
     * @return Current token ID counter
     */
    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev Get total supply of minted tokens
     * @return Total number of tokens minted
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter - 1; // Subtract 1 since counter starts at 1
    }
    
    /**
     * @dev Check if a token exists
     * @param tokenId Token ID to check
     * @return Boolean indicating if token exists
     */
    function exists(uint256 tokenId) public view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    /**
     * @dev Update token URI (for post-mint metadata updates)
     * @param tokenId Token ID to update
     * @param uri New metadata URI
     */
    function updateTokenURI(uint256 tokenId, string memory uri) public onlyOwner {
        require(exists(tokenId), "Token does not exist");
        _setTokenURI(tokenId, uri);
    }
    
    // Required overrides for ERC721URIStorage
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev Withdraw contract balance (if needed for future features)
     */
    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}