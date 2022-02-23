import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {parseEther} from "@ethersproject/units"

task("entry", "burns tokens from account")
    .setAction(async function (taskArgs, hre) {
        const ZERO_ADDR = "0x0000000000000000000000000000000000000000"

        const network = hre.network.name;

        console.log(network);
        let usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        let dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
        let frax = "0x853d955aCEf822Db058eb8505911ED77F175b99e"
        let usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
        
        const [...addr] = await hre.ethers.getSigners();

        const exec = await hre.ethers.getContractAt("VoteExecutor", "0xc7b3eA16B43e361Db29cCB6FB8BAeb0Dd9C5824C");

        // await exec.connect(addr[0]).changeEntryTokenStatus(usdc, false)

        let entries = [{ 
            weight: 50, 
            entryToken: dai, 
            curvePool: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
            poolToken: frax,
            poolSize: 2,
            tokenIndexInCurve: 0,
            convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
            //convexPoolAddress:ZERO_ADDR,
            convexPoold:32
        },
          { weight: 50, 
            entryToken: usdt, 
            curvePool: "0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C",
            poolToken: usdt,
            poolSize: 3,
            tokenIndexInCurve: 2,
            convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
            //convexPoolAddress:ZERO_ADDR,
            convexPoold:1
        }]

        
        await exec.connect(addr[0]).execute(entries)
        

        console.log('entry task Done!');
    });
