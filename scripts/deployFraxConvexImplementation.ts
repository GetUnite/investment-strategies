import { formatEther, formatUnits, isAddress } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import * as readline from 'readline';
import { CurveFraxConvexStrategyV2 } from "../typechain/CurveFraxConvexStrategyV2";

function ask(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

async function main() {
    const deployer = (await ethers.getSigners())[0];
    const networkName = (await ethers.provider.getNetwork()).name;
    console.log("Network:",);
    const gasPrice = await ethers.provider.getGasPrice();
    console.log("Network gas price:", formatUnits(gasPrice, 9), "gwei");
    console.log("Deployer:", deployer.address);
    const balance = await deployer.getBalance();
    console.log("Deployer balance:", formatEther(balance));
    console.log("    that is enough for", balance.div(gasPrice).toString(), "gas");

    const CurveFraxConvexStrategy = await ethers.getContractFactory("CurveFraxConvexStrategyV2");
    let upgradedContract = await upgrades.prepareUpgrade("0x4d8dE98F908748b91801d74d3F784389107F51d7", CurveFraxConvexStrategy, { unsafeAllow: ["delegatecall"] });
    console.log("Upgraded contract:", upgradedContract);
    let upgradedContract2 = await upgrades.prepareUpgrade("0x7f609E0b083d9E1Edf0f3EfD1C6bdd2b16080EEd", CurveFraxConvexStrategy, { unsafeAllow: ["delegatecall"], useDeployedImplementation: true });

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });