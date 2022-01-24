import { task } from "hardhat/config";
import "@typechain/hardhat";
import readline from 'readline';
import { HardhatRuntimeEnvironment } from "hardhat/types";

function ask(query: string) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

async function template(hre: HardhatRuntimeEnvironment, action: () => Promise<void>) {
    console.log("================= START =================");
    const accounts = await hre.ethers.getSigners();
    const sender = accounts[0];
    const balance = await sender.getBalance();
    const networkName = hre.network.name;
    console.log("Sender address: ", sender.address);
    console.log("Sender balance: ", hre.ethers.utils.formatEther(balance));
    console.log("Network:", networkName);
    if (networkName == "maticmainnet" || networkName == "mainnet") {
        console.log();
        console.log("WARNING - Mainnet selected!!!");
        console.log("WARNING - Mainnet selected!!!");
        console.log("WARNING - Mainnet selected!!!");
        console.log();
        await ask(`Confirm working in mainnet. Ctrl + C to abort.`);
        console.log("Good luck.");
    }
    else {
        await ask("Is sender and network ok?");
    }

    await action();

    console.log("================== END ==================");
}
