// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;
import "hardhat/console.sol";

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./ethereum/CurveConvex/UniversalCurveConvexStrategy.sol";

contract VoteExecutorNotCommented is AccessControl {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    struct Entry{
        uint8 weight;
        address entryToken;
        address curvePool;
        address poolToken;
        uint8 poolSize;
        uint8 tokenIndexInCurve;
        address convexPoolAddress;
        uint256 convexPoold;
    }

    EnumerableSet.AddressSet private entryTokens;

    address public strategyDeployer;
    address public exchangeAddress;

    uint32 slippage = 2;

    constructor(address _newAdmin)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, _newAdmin);
    }

    function execute(Entry[] memory _entries) external onlyRole(DEFAULT_ADMIN_ROLE){
        uint8 totalWeight;
        uint256 entriesNumber = _entries.length;
        for(uint256 i = 0; i < entriesNumber; i++){
            totalWeight += _entries[i].weight;
            require(entryTokens.contains(_entries[i].entryToken), "There is not such entry token");
        }
        require(totalWeight <= 100, "VoteExecutor: total weight more then 100");

        uint256 totalBalance = getTotalBalance();
        uint256 amount;

        for(uint256 i = 0; i < entriesNumber; i++){

            Entry memory entry = _entries[i];

            amount = entry.weight * totalBalance / 100;

            uint256 entryDecimalsMult = 10**(18 - ERC20(entry.entryToken).decimals());
            uint256 poolDecimalsMult = 10**(18 - ERC20(entry.poolToken).decimals());

            uint256 actualAmount = IERC20(entry.entryToken).balanceOf(address(this)) * entryDecimalsMult;

            if(actualAmount < amount){
                uint256 amountLeft = amount - actualAmount;

                //might be some errors
                uint256 maxLoop = entryTokens.length();
                while(amountLeft > 0 && maxLoop != 0){
                    (address helpToken, uint256 helpAmount) = findBiggest(entry.entryToken);
                    maxLoop--;
                    if(amountLeft <= helpAmount){

                        uint256 exchangeAmount = amountLeft / 10**(18 - ERC20(helpToken).decimals());

                        actualAmount += exchange(
                            helpToken, 
                            entry.entryToken, 
                            exchangeAmount,
                            exchangeAmount * (100 - slippage) / 100
                        ) * entryDecimalsMult;
                        amountLeft = 0;
                    }
                    else{
                        uint256 exchangeAmount = helpAmount / 10**(18 - ERC20(helpToken).decimals());

                        actualAmount += exchange(
                            helpToken, 
                            entry.entryToken, 
                            exchangeAmount,
                            exchangeAmount * (100 - slippage) / 100
                        ) * entryDecimalsMult;
                        amountLeft -= helpAmount;
                    }
                }
                amount = actualAmount;
            }
            if(entry.entryToken != entry.poolToken){

                amount = exchange(
                    entry.entryToken, 
                    entry.poolToken, 
                    amount / entryDecimalsMult,
                    0
                );
            }
            else{
                amount = amount / poolDecimalsMult;
            }
            uint256[4] memory arrAmounts;
            arrAmounts[entry.tokenIndexInCurve] = amount;
            
            IERC20[4] memory arrTokens;
            arrTokens[entry.tokenIndexInCurve] = IERC20(entry.poolToken);

            IERC20(entry.poolToken).safeTransfer(strategyDeployer, amount / poolDecimalsMult);

            UniversalCurveConvexStrategy(strategyDeployer).deployToCurve(
                arrAmounts,
                arrTokens,
                entry.poolSize,
                entry.curvePool
            );

            if(entry.convexPoolAddress != address(0)){

                UniversalCurveConvexStrategy(strategyDeployer).deployToConvex(
                    entry.convexPoolAddress,
                    entry.convexPoold
                );
            }
        }
    }

    function getTotalBalance() 
        public 
        view 
        returns(uint256 totalBalance)
    {
        for(uint256 i = 0; i < entryTokens.length(); i++){
            totalBalance += IERC20(entryTokens.at(i)).balanceOf(address(this)) * 10**(18 - ERC20(entryTokens.at(i)).decimals()); 
        }
    }

    function getListEntryTokens() public view returns (address[] memory) {
        return entryTokens.values();
    }

    function changeEntryTokenStatus(
        address _tokenAddress,
        bool _status
    ) external onlyRole(DEFAULT_ADMIN_ROLE){
        if(_status){
            entryTokens.add(_tokenAddress);
            IERC20(_tokenAddress).safeApprove(exchangeAddress, type(uint256).max);
            IERC20(_tokenAddress).safeApprove(strategyDeployer, type(uint256).max);
        }
        else{
            entryTokens.remove(_tokenAddress);
            IERC20(_tokenAddress).safeApprove(exchangeAddress, 0);
            IERC20(_tokenAddress).safeApprove(strategyDeployer, 0);
        }
    }

    function changeSlippage(
        uint32 _slippage
    ) external onlyRole(DEFAULT_ADMIN_ROLE){
        slippage = _slippage;
    }

    function addStrategy(
        address _strategyAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE){
        strategyDeployer = _strategyAddress;
    }
    
    function addExchange(
        address _exchangeAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE){
        exchangeAddress = _exchangeAddress;
    }

    function findBiggest(address _entry) internal view returns(address token_, uint256 amount_){
        for(uint256 i = 0; i < entryTokens.length(); i++){

            if(entryTokens.at(i) != _entry){
                address token = entryTokens.at(i);
                uint256 newAmount = IERC20(token).balanceOf(address(this)) * 10**(18 - ERC20(token).decimals());
                if(amount_ < newAmount){
                    amount_ = newAmount;
                    token_ = token;
                }
            }
        }
    }

    function exchange(
        address from,
        address to,
        uint256 amountIn,
        uint256 minAmountOut
    ) public payable returns (uint256){
        IERC20(from).safeTransfer(exchangeAddress, amountIn);

        uint256 amountOut = amountIn  * 10**(18 - ERC20(from).decimals()) / 10**(18 - ERC20(to).decimals());

        IERC20(to).safeTransferFrom(exchangeAddress, address(this), amountOut * 98 / 100);
        return amountOut * 98 / 100;
    }

}
