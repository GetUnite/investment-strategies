import { formatEther, formatUnits, isAddress } from "ethers/lib/utils";
import hre, { ethers } from "hardhat";
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

    await ask(`Verify input:\n\tvoteExecutor: '${voteExecutor}'\n\tgnosis: '${gnosis}'\nPress enter to start deploy on ${networkName} network`);

    console.log("Deploying...")
    const BalancerStrategy = await ethers.getContractFactory('BalancerStrategy');
    const strategy = await BalancerStrategy.deploy(voteExecutor, gnosis, false);

    console.log("Deployed at", strategy.address);
    console.log("Waiting for 5 confirmations before auto verification...");
    await strategy.deployTransaction.wait(5);

    console.log("Running verify task");
    await hre.run("verify:verify", {
        address: strategy.address,
        constructorArguments: [voteExecutor, gnosis, false],
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });