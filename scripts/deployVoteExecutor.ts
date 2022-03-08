import { ethers } from "hardhat"

async function main() {

  const [...addr] = await ethers.getSigners();

  const Executor = await ethers.getContractFactory("VoteExecutor");

  const executor = await Executor.deploy(
    "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3",   //admin
    "0xa248Ba96d72005114e6C941f299D315757877c0e", //strategy
    "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec", //exchange
    [
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",// USDC
    "0x6B175474E89094C44Da98b954EedeAC495271d0F",// DAI
    "0xdAC17F958D2ee523a2206206994597C13D831ec7", //USDT
    "0x853d955aCEf822Db058eb8505911ED77F175b99e" //FRAX
  ]);

  await executor.deployed();

  console.log("Executor deployed to:", executor.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });