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

    const Strategy = await ask("\nVStrategy address: ");
    if (!isAddress(Strategy)) {
        console.log("Error: provided input is not address");
        return;
    }

    const strategyHandler = await ask("\nStrategy handler address: ");
    if (!isAddress(strategyHandler)) {
        console.log("Error: provided input is not address");
        return
    }

    const CurveFraxConvexStrategy = await ethers.getContractAt("CurveFraxConvexStrategyV2", Strategy);
    const handler = await ethers.getContractAt("StrategyHandler", strategyHandler);

    const curvePool = "0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2";
    const fraxPool = "0x963f487796d54d2f27bA6F3Fbe91154cA103b199";
    const poolSize = 2;
    const poolTokenAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const lpToken = '0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC';
    const tokenIndexInCurve = 1;
    const duration = 60 * 60 * 24 * 8; // 8 days

    await ask(`Verify:\n\tStrategy: '${Strategy}'\nPress enter to start deploy on ${networkName} network`);
    await ask(`Verify input:\n\tStrategy: '${Strategy}'\nPress enter to start deploy on ${networkName} network`);

    const _entryData = await CurveFraxConvexStrategy.encodeEntryParams(
        curvePool, poolTokenAddress, poolSize, tokenIndexInCurve, fraxPool, duration);
    const _rewardsData = await CurveFraxConvexStrategy.encodeRewardsParams(lpToken, fraxPool, 0);
    const _exitData = await CurveFraxConvexStrategy.encodeExitParams(curvePool, poolTokenAddress, tokenIndexInCurve, fraxPool);


    await handler.addLiquidityDirection(
        "Convex: FRAX/USDC",
        CurveFraxConvexStrategy.address,
        poolTokenAddress,
        0, // USDC
        1, // Ethereum
        _entryData,
        _exitData,
        _rewardsData
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });