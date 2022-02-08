// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "./interfaces/ICvxBooster.sol";
import "./interfaces/ICvxBaseRewardPool.sol";

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract UniversalCurveConvexStrategy is AccessControl {
    using SafeERC20 for IERC20;
    using Address for address;

    constructor(address admin) {
        require(admin.isContract(), "Strategy: admin not contract");
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function deployToCurve(
        uint256[2] calldata twoPoolTokensAmount,
        uint256[3] calldata threePoolTokensAmount,
        uint256[4] calldata fourPoolTokensAmount,
        uint256[] calldata dynamicTokensAmount,
        IERC20[] calldata tokens,
        address curvePool
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint8 length = uint8(tokens.length);
        for (uint8 index = 0; index < length; index++) {
            if (dynamicTokensAmount[index] > 0) {
                tokens[index].safeIncreaseAllowance(
                    curvePool,
                    dynamicTokensAmount[index]
                );
            }
        }

        bytes memory curveCall;
        if (length == 2) {
            curveCall = abi.encodeWithSignature(
                "add_liquidity(uint256[2],uint256)",
                twoPoolTokensAmount,
                0
            );
        } else if (length == 3) {
            curveCall = abi.encodeWithSignature(
                "add_liquidity(uint256[3],uint256)",
                threePoolTokensAmount,
                0
            );
        } else if (length == 4) {
            curveCall = abi.encodeWithSignature(
                "add_liquidity(uint256[4],uint256)",
                fourPoolTokensAmount,
                0
            );
        } else {
            revert("Strategy: wrong tokens length");
        }

        curvePool.functionCall(curveCall);
    }

    function deployToConvex(
        ICvxBooster cvxBooster,
        uint256 poolId,
        uint256 lpAmount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        (address token, , , , , ) = cvxBooster.poolInfo(poolId);
        IERC20(token).safeIncreaseAllowance(address(cvxBooster), lpAmount);
        cvxBooster.deposit(poolId, lpAmount, true);
    }

    function claimAll(ICvxBaseRewardPool pool)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        pool.getReward(address(this), true);
    }

    function withdraw(ICvxBaseRewardPool pool, uint256 lpAmount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        pool.withdrawAndUnwrap(lpAmount, true);
    }

    function exit(
        uint256[2] calldata twoPoolTokensAmount,
        uint256[3] calldata threePoolTokensAmount,
        uint256[4] calldata fourPoolTokensAmount,
        address pool,
        uint8 tokensCount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes memory curveCall;
        if (tokensCount == 2) {
            curveCall = abi.encodeWithSignature(
                "remove_liquidity_imbalance(uint256[2],uint256)",
                twoPoolTokensAmount,
                type(uint256).max
            );
        } else if (tokensCount == 3) {
            curveCall = abi.encodeWithSignature(
                "remove_liquidity_imbalance(uint256[3],uint256)",
                threePoolTokensAmount,
                type(uint256).max
            );
        } else if (tokensCount == 4) {
            curveCall = abi.encodeWithSignature(
                "remove_liquidity_imbalance(uint256[4],uint256)",
                fourPoolTokensAmount,
                type(uint256).max
            );
        } else {
            revert("Strategy: wrong tokens length");
        }

        pool.functionCall(curveCall);
    }

    function exitOneCoin(
        address pool,
        uint256 coinIndex,
        uint256 lpBurnAmount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes memory curveCall = abi.encodeWithSignature(
            "remove_liquidity_one_coin(uint256,int128,uint256)",
            lpBurnAmount,
            coinIndex,
            0
        );
        pool.functionCall(curveCall);
    }

    function withdrawTokens(
        IERC20 token,
        address destination,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        token.safeTransfer(destination, amount);
    }

    function executeCall(address destination, bytes calldata _calldata)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        destination.functionCall(_calldata);
    }

    function grantRole(bytes32 role, address account)
        public
        override
        onlyRole(getRoleAdmin(role))
    {
        require(account.isContract(), "Strategy: admin not contract");
        _grantRole(role, account);
    }
}
