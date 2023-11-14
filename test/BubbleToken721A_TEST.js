const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const { expect } = require('chai');
const { ethers, waffle } = require('hardhat');

let whileListObj = (_whiteList) => {
  const leaves = _whiteList.map((addr) => keccak256(addr));
  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return merkleTree;
};

let getRootHash = (_merkleTree) => {
  return _merkleTree.getRoot().toString('hex');
};

let getProof = (_merkleTree, address) => {
  return _merkleTree.getHexProof(keccak256(address));
};

/-------------------------------/;

describe('Tests ERC721A', function () {
  let nftContract;
  let NftContract;

  let owner;
  let user1;
  let user2;
  let user3;
  let user4;
  let user5;
  let user6;
  let user7;

  let merkleTree;
  let rootHash;

  before(async () => {
    [owner, user1, user2, user3, user4, user5, user6, user7] = await ethers.getSigners();

    // white list group
    const arr = [owner.address, user1.address, user2.address, user3.address];
    merkleTree = whileListObj(arr);
    rootHash = '0x' + getRootHash(merkleTree);

    NftContract = await ethers.getContractFactory('BubbleToken', owner);
    nftContract = await NftContract.deploy('Damir', 'Damir', rootHash);
    await nftContract.deployed();
  });

  it('Should be deployed FactoryInvest721A contract', async function () {
    expect(nftContract.address).to.be.properAddress;
  });

  it('Should check owner', async function () {
    const defaultAdmin = await nftContract.owner();
    expect(defaultAdmin).to.equal(owner.address);
  });

  it('Should set owner', async function () {
    await nftContract.connect(owner).transferOwnership(user1.address);
    const newOwner = await nftContract.owner();
    expect(newOwner).to.equal(user1.address);
    await nftContract.connect(user1).transferOwnership(owner.address);
  });

  it('Check and set Price', async function () {
    const amount = 10000000000000000n;
    const oneEther = 1000000000000000000n;
    const price = await nftContract.price();
    expect(amount).to.equal(price);

    await expect(nftContract.connect(user1).setPrice(oneEther)).to.be.revertedWith(
      /Ownable: caller is not the owner*/,
    );

    await nftContract.setPrice(oneEther);
    const newPrice = await nftContract.price();
    expect(oneEther).to.equal(newPrice);
    await nftContract.setPrice(amount);
  });

  it('Check and set Root', async function () {
    const newRoot = '0x55e8063f883b9381398d8fef6fbae371817e8e4808a33a4145b8e3cdd65e3926';
    const root = await nftContract.root();
    expect(root).to.equal(rootHash);

    expect(nftContract.connect(user3).setRoot(newRoot)).to.be.revertedWith(
      'Ownable: caller is not the owner',
    );

    await nftContract.setRoot(newRoot);
    const afterSetRoot = await nftContract.root();
    expect(afterSetRoot).to.equal(newRoot);
    await nftContract.setRoot(root);
  });

  it('Check pause for safeMintWhiteList', async function () {
    //check pause is false
    const proof = getProof(merkleTree, owner.address);

    expect(nftContract.connect(user3).setPause()).to.be.revertedWith(
      'Ownable: caller is not the owner',
    );

    let pause = await nftContract.pause();
    expect(pause).to.equal(false);
    await nftContract.safeMintWhiteList(user1.address, 1, proof);
    //check how is owner
    const ownerAdd = await nftContract.ownerOf(0);
    expect(ownerAdd).to.equal(user1.address);
    await nftContract.setPause();
    //set Pause = true, and check pause with safeMintWhiteList
    const pauseTrue = await nftContract.pause();
    expect(pauseTrue).to.equal(true);

    expect(
      nftContract.connect(user3).safeMintWhiteList(user1.address, 1, proof),
    ).to.be.revertedWith('Ownable: caller is not the owner');
    // set Pause = false

    await nftContract.setPause();
    pause = await nftContract.pause();
    expect(pause).to.equal(false);
  });

  it('Should reverted wit custom error(LessMoney and Pause) in safeMint', async function () {
    const amount = 20000000000000000n;
    await expect(nftContract.safeMint(user1.address, 5)).to.be.revertedWithCustomError(
      nftContract,
      'LessMoney',
    );
    await expect(
      nftContract.safeMint(user1.address, 5, { value: amount }),
    ).to.be.revertedWithCustomError(nftContract, 'LessMoney');

    await nftContract.setPause();
    await expect(
      nftContract.safeMint(user1.address, 5, { value: amount }),
    ).to.be.revertedWithCustomError(nftContract, 'Pause');
    await nftContract.setPause();
  });

  it('Should mint nft with eth', async function () {
    const proof = getProof(merkleTree, owner.address);
    const amount = 20000000000000000n;
    const totalSupply = await nftContract.totalSupply();
    const quantity = 2;
    await nftContract.setPause();
    await expect(
      nftContract.safeMintWhiteList(user1.address, 1, proof),
    ).to.be.revertedWithCustomError(nftContract, 'Pause');
    await nftContract.setPause();
    await nftContract.safeMint(user1.address, quantity, { value: amount });
    const NewTotalSupply = await nftContract.totalSupply();
    expect(NewTotalSupply - totalSupply).to.equal(quantity);
    //check for owner nft
    for (let i = 0; i < NewTotalSupply; i++) {
      const ownerAdd = await nftContract.ownerOf(i);
      expect(ownerAdd).to.equal(user1.address);
    }
  });

  it('Should mint nft for whitelist group', async function () {
    //safeMintWhiteList-whiteList Owner
    const proofOwner = getProof(merkleTree, owner.address);
    const totalSupply = await nftContract.totalSupply();
    await nftContract.safeMintWhiteList(owner.address, 3, proofOwner);
    const NewTotalSupply = await nftContract.totalSupply();
    expect(NewTotalSupply - totalSupply).to.equal(3);

    for (let i = totalSupply; i < NewTotalSupply; i++) {
      const ownerAdd = await nftContract.ownerOf(i);
      expect(ownerAdd).to.equal(owner.address);
    }
    //safeMintWhiteList-whiteList User1
    const prooUser1 = getProof(merkleTree, user1.address);
    const totalSupplyU1 = await nftContract.totalSupply();
    await nftContract.safeMintWhiteList(user1.address, 5, proofOwner);
    const NewTotalSupplyU1 = await nftContract.totalSupply();
    expect(NewTotalSupplyU1 - totalSupplyU1).to.equal(5);

    for (let i = totalSupplyU1; i < NewTotalSupplyU1; i++) {
      const ownerAdd = await nftContract.ownerOf(i);
      expect(ownerAdd).to.equal(user1.address);
    }
    //safeMintWhiteList-whiteList User2
    const prooUser2 = getProof(merkleTree, user2.address);
    const totalSupplyU2 = await nftContract.totalSupply();
    await nftContract.safeMintWhiteList(user2.address, 5, proofOwner);
    const NewTotalSupplyU2 = await nftContract.totalSupply();
    expect(NewTotalSupplyU2 - totalSupplyU2).to.equal(5);

    for (let i = totalSupplyU2; i < NewTotalSupplyU2; i++) {
      const ownerAdd = await nftContract.ownerOf(i);
      expect(ownerAdd).to.equal(user2.address);
    }

    //safeMintWhiteList-whiteList User3
    const prooUser3 = getProof(merkleTree, user3.address);
    const totalSupplyU3 = await nftContract.totalSupply();
    await nftContract.safeMintWhiteList(user3.address, 1, proofOwner);
    const NewTotalSupplyU3 = await nftContract.totalSupply();
    expect(NewTotalSupplyU3 - totalSupplyU3).to.equal(1);

    for (let i = totalSupplyU3; i < NewTotalSupplyU3; i++) {
      const ownerAdd = await nftContract.ownerOf(i);
      expect(ownerAdd).to.equal(user3.address);
    }
  });

  it('Should mint for owner contract safeMintOwner', async function () {
    await expect(nftContract.connect(user1).safeMintOwner(user1.address, 5)).to.be.revertedWith(
      /Ownable: caller is not the owner*/,
    );

    await nftContract.setPause();

    await expect(nftContract.safeMintOwner(user1.address, 1)).to.be.revertedWithCustomError(
      nftContract,
      'Pause',
    );

    await nftContract.setPause();

    const totalSupply = await nftContract.totalSupply();
    await nftContract.safeMintOwner(user5.address, 20);
    const NewTotalSupply = await nftContract.totalSupply();

    for (let i = totalSupply; i < NewTotalSupply; i++) {
      const ownerAdd = await nftContract.ownerOf(i);
      expect(ownerAdd).to.equal(user5.address);
    }
  });

  it('Should withdraw ether to owner', async function () {
    const amount = 20000000000000000n;
    await expect(nftContract.connect(user1).withdraw()).to.be.revertedWith(
      /Ownable: caller is not the owner*/,
    );

    await expect(() => nftContract.withdraw()).to.changeEtherBalance(owner, amount);
  });

  it('Should transfer nft owner to user 7', async function () {
    const balanceNft = await nftContract.balanceOf(user7.address);
    expect(balanceNft).to.equal(0);

    const total = await nftContract.totalSupply();
    let id;

    for (let i = 0; i < total; i++) {
      const add = await nftContract.ownerOf(i);
      if (add == owner.address) {
        await nftContract.transferFrom(owner.address, user7.address, i);
        id = i;
        break;
      }
    }
    const newBalanceNft = await nftContract.balanceOf(user7.address);
    expect(newBalanceNft).to.equal(1);
  });
});
