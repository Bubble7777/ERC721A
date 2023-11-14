// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

error LessMoney();
error Pause();

contract BubbleToken is ERC721A, Ownable {

    bytes32 public root;
    uint256 public price = 0.01 ether;
    string private _baseTokenURI;
    bool public pause;

     modifier pausable( ) {
        if(pause){
            revert Pause();
        }
        _;
    }
    constructor(string memory name_, string memory symbol_,bytes32 _root) ERC721A(name_, symbol_) {
        root = _root;
    }

    function safeMint(address to,uint256 quantity) external payable pausable {
        uint256 totalPrice = quantity * price;
        if(msg.value < totalPrice ){
             revert LessMoney();
         }
        _safeMint(to, quantity);
    } 
    
     function safeMintWhiteList(address to,uint256 quantity, bytes32[] memory proof) external pausable {
        bytes32 _leaf = keccak256(abi.encodePacked(_msgSender()));
        if(isValid(proof, _leaf)){
             _safeMint(to, quantity);
        }
    }

    function safeMintOwner(address to,uint256 quantity) external pausable onlyOwner{
            _safeMint(to, quantity);
        } 

    function isValid(bytes32[] memory  proof,bytes32 leaf) public view returns(bool){
        return MerkleProof.verify(proof,root,leaf);
    }

    function setPrice(uint256 _PriceInWEI) external onlyOwner {
        price = _PriceInWEI;
    }

    function setPause() external onlyOwner {
        pause = !pause;
    }

    function setRoot(bytes32 _root) external onlyOwner {
        root = _root;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}