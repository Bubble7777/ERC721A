const hre = require('hardhat');

async function main() {
  const root = '0xd4453790033a2bd762f526409b7f358023773723d9e9bc42487e4996869162b6';
  const BubbleToken = await hre.ethers.getContractFactory('BubbleToken');
  const bubbleToken = await BubbleToken.deploy('Bubble', 'BBB', root);

  await bubbleToken.deployed();

  console.log('bubbleToken:', bubbleToken.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
