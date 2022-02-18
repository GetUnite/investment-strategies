import { ethers } from "hardhat"

async function main() {

  const [...addr] = await ethers.getSigners();

  const Strategy = await ethers.getContractFactory("UniversalCurveConvexStrategy");

  const strategy = await Strategy.deploy(addr[0].address);
  await strategy.deployed();

  console.log("Universal Strategy deployed to:", strategy.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });