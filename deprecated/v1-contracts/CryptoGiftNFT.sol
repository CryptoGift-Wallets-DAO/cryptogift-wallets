// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title CryptoGiftNFT
 * @dev Simple NFT contract for CryptoGift platform
 * Supports basic minting with URI storage for metadata
 */
contract CryptoGiftNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    
    // Contract metadata
    string private _contractURI;
    
    // Events
    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
    
    constructor(
        string memory name,
        string memory symbol,
        string memory contractURI_,
        address owner
    ) ERC721(name, symbol) {
        _contractURI = contractURI_;
        _transferOwnership(owner);
        
        // Start token IDs at 1
        _tokenIdCounter.increment();
    }
    
    /**
     * @dev Mint NFT to specified address with metadata URI
     * @param to Recipient address
     * @param uri Metadata URI for the NFT
     * @return tokenId The minted token ID
     */
    function mintTo(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit NFTMinted(to, tokenId, uri);
        return tokenId;
    }
    
    /**
     * @dev Batch mint NFTs
     * @param to Recipient address
     * @param uris Array of metadata URIs
     * @return tokenIds Array of minted token IDs
     */
    function batchMintTo(address to, string[] memory uris) public onlyOwner returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](uris.length);
        
        for (uint256 i = 0; i < uris.length; i++) {
            tokenIds[i] = mintTo(to, uris[i]);
        }
        
        return tokenIds;
    }
    
    /**
     * @dev Get current token ID counter
     */
    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIdCounter.current();
    }
    
    /**
     * @dev Get total supply of tokens
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current() - 1;
    }
    
    /**
     * @dev Contract-level metadata URI
     */
    function contractURI() public view returns (string memory) {
        return _contractURI;
    }
    
    /**
     * @dev Update contract metadata URI (owner only)
     */
    function setContractURI(string memory contractURI_) public onlyOwner {
        _contractURI = contractURI_;
    }
    
    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}