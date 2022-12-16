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

    const voteExecutor = await ask("\nVoteExecutor address: ");
    if (!isAddress(voteExecutor)) {
        console.log("Error: provided input is not address");
        return;
    }

    const gnosis = await ask("\nGnosis multisig address: ");
    if (!isAddress(gnosis)) {
        console.log("Error: provided input is not address");
        return
    }

    const strategyHandler = await ask("\nStrategy handler address: ");
    if (!isAddress(strategyHandler)) {
        console.log("Error: provided input is not address");
        return
    }

    await ask(`Verify input:\n\tvoteExecutor: '${voteExecutor}'\n\tgnosis: '${gnosis}'\nPress enter to start deploy on ${networkName} network`);

    console.log("Deploying...")
    const CurveFraxConvexStrategy = await ethers.getContractFactory("CurveFraxConvexStrategyV2");
    const routerAddress = "0x24733D6EBdF1DA157d2A491149e316830443FC00"
    const strategy = await upgrades.deployProxy(CurveFraxConvexStrategy,
        [gnosis, voteExecutor, strategyHandler, routerAddress], {
        initializer: 'initialize',
        kind: 'uups',
        unsafeAllow: ["delegatecall"]
    }
    ) as CurveFraxConvexStrategyV2

    console.log("Deployed at", strategy.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });