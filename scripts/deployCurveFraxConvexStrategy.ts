import { ethers } from "hardhat";

async function main() {
   let voteExecutor = 
    console.log("Deploying...")
    const CurveFraxConvexStrategy = await ethers.getContractFactory("CurveFraxConvexStrategy");
    const strategy = await CurveFraxConvexStrategy.deploy(ethers.constants.AddressZero,ethers.constants.AddressZero, true);

    console.log("Deployed at", strategy.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });