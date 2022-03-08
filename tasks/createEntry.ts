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
        let crv3 = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490"
        
        const [...addr] = await hre.ethers.getSigners();

        const exec = await hre.ethers.getContractAt("VoteExecutor", "0x9EB0a0751cf514262AAF45F4d856f36df56017ae");

        let entries = [
            { 
                weight: 45, //OK
                entryToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", //OK
                curvePool: "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89", // OK
                poolToken: "0x853d955aCEf822Db058eb8505911ED77F175b99e", // OK
                poolSize: 3, // OK
                tokenIndexInCurve: 0, // OK 
                convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31", //OK
                convexPoold:58 // OK
            },
            { 
                weight: 38, 
                entryToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // OK
                curvePool: "0xCEAF7747579696A2F0bb206a14210e3c9e6fB269", // OK
                poolToken: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490", // OK
                poolSize: 2, // OK
                tokenIndexInCurve: 1, // OK
                convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31", // OK
                convexPoold:59 // OK
            },
            {   
                weight: 17, 
                entryToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // OK
                curvePool: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B", // OK
                poolToken: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490", // OK
                poolSize: 2, // OK 
                tokenIndexInCurve: 1, // OK
                convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31", // OK 
                convexPoold:40
            }
        ]

        await exec.connect(addr[0]).execute(entries)
        
        console.log('entry task Done!');
    });
