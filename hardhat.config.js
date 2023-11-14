require('@nomicfoundation/hardhat-toolbox');
require('solidity-coverage');
require('dotenv').config();

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.4',
      },
    ],
  },
  networks: {
    testnet: {
      url: process.env.PUBLIC_URL,
      accounts: [process.env.PRIVATE_KEY],
      //chainId: 97,
      //gasPrice: 20000000000,
    },
  },
};
