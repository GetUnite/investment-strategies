import { ethers, upgrades } from "hardhat";
import * as readline from 'readline';

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

    const newStrategyHandler = await ethers.getContractFactory("StrategyHandler");
    // Check upgrade safety
    const currentStrategyHandler = "0x385AB598E7DBF09951ba097741d2Fa573bDe94A5"
    console.log(await upgrades.prepareUpgrade(currentStrategyHandler, newStrategyHandler));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });