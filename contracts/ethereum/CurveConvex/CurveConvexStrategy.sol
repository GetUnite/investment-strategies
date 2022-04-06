// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

import "./../../IAlluoStrategy.sol";
import "./interfaces/ICvxBooster.sol";
import "./interfaces/ICvxBaseRewardPool.sol";
import "./interfaces/IExchange.sol";

contract CurveConvexStrategy is AccessControl, IAlluoStrategy {
    using Address for address;
    using SafeERC20 for IERC20;

    ICvxBooster public constant cvxBooster =
        ICvxBooster(0xF403C135812408BFbE8713b5A23a04b3D48AAE31);
    IExchange public constant exchange =
        IExchange(0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec);
    IERC20 public constant cvxRewards =
        IERC20(0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B);
    IERC20 public constant crvRewards =
        IERC20(0xD533a949740bb3306d119CC777fa900bA034cd52);

    constructor(address gnosis, bool isTesting) {
        require(gnosis.isContract(), "CurveConvexStrategy: !contract");
        _grantRole(DEFAULT_ADMIN_ROLE, gnosis);
        if (isTesting) _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function invest(bytes calldata data, uint256 amount) external {
        require(data.length == 32 * 5, "CurveConvexStrategy: data length");
        (
            address curvePool,
            IERC20 poolToken,
            uint8 poolSize,
            uint8 tokenIndexInCurve,
            uint256 poolId
        ) = decodeEntryParams(data);

        // prepare amounts array for curve
        uint256[4] memory fourPoolTokensAmount;
        fourPoolTokensAmount[tokenIndexInCurve] = amount;

        // approve tokens to curve pool
        poolToken.safeIncreaseAllowance(curvePool, amount);

        // encode call to curve - this ugly code handles different curve pool
        // sizes and function selectors
        bytes memory curveCall;
        if (poolSize == 2) {
            curveCall = abi.encodeWithSignature(
                "add_liquidity(uint256[2],uint256)", // TODO - Calculate selectors
                uint256[2]([fourPoolTokensAmount[0], fourPoolTokensAmount[1]]),
                0
            );
        } else if (poolSize == 3) {
            curveCall = abi.encodeWithSignature(
                "add_liquidity(uint256[3],uint256)",
                uint256[3](
                    [
                        fourPoolTokensAmount[0],
                        fourPoolTokensAmount[1],
                        fourPoolTokensAmount[2]
                    ]
                ),
                0
            );
        } else {
            curveCall = abi.encodeWithSignature(
                "add_liquidity(uint256[4],uint256)",
                fourPoolTokensAmount,
                0
            );
        }

        // execute call
        curvePool.functionCall(curveCall);

        // skip investment in convex, if poolId is uint256 max value
        if (poolId != type(uint256).max) {
            // invest tokens to convex
            IERC20 token = getLpToken(poolId);
            uint256 lpAmount = token.balanceOf(address(this));
            token.safeIncreaseAllowance(address(cvxBooster), lpAmount);
            cvxBooster.deposit(poolId, lpAmount, true);
        }
    }

    function exitAll(
        bytes calldata data,
        uint256 unwindPercent,
        uint8 unwindDecimals,
        address outputCoin,
        address receiver,
        bool swapRewards
    ) external {
        (
            address curvePool,
            uint8 tokenIndexInCurve,
            uint256 convexPoolId
        ) = decodeExitParams(data);

        uint256 lpAmount;
        if (convexPoolId != type(uint256).max) {
            ICvxBaseRewardPool rewards = getCvxRewardPool(convexPoolId);
            lpAmount =
                (rewards.balanceOf(address(this)) * unwindPercent) /
                (10**(2 + unwindDecimals));

            // withdraw Curve LPs and all rewards
            rewards.withdrawAndUnwrap(lpAmount, true);
        } else {
            lpAmount = getLpToken(convexPoolId).balanceOf(address(this));
        }

        if (lpAmount == 0) return;

        // exit with coin that we used for entry
        bytes memory curveCall = abi.encodeWithSignature(
            "remove_liquidity_one_coin(uint256,int128,uint256)",
            lpAmount,
            tokenIndexInCurve,
            0
        );
        curvePool.functionCall(curveCall);

        // execute exchanges and transfer all tokens to receiver
        manageRewardsAndWithdraw(swapRewards, IERC20(outputCoin), receiver);
    }

    function exitOnlyRewards(
        bytes calldata data,
        address outputCoin,
        address receiver,
        bool swapRewards
    ) external {
        (, , uint256 convexPoolId) = decodeExitParams(data);
        ICvxBaseRewardPool rewards = getCvxRewardPool(convexPoolId);
        rewards.getReward(address(this), true);

        manageRewardsAndWithdraw(swapRewards, IERC20(outputCoin), receiver);
    }

    function encodeEntryParams(
        address curvePool,
        address poolToken,
        uint8 poolSize,
        uint8 tokenIndexInCurve,
        uint256 convexPoolId
    ) external pure returns (bytes memory) {
        return
            abi.encode(
                curvePool,
                poolToken,
                poolSize,
                tokenIndexInCurve,
                convexPoolId
            );
    }

    function encodeExitParams(
        address curvePool,
        uint8 tokenIndexInCurve,
        uint256 convexPoolId
    ) external pure returns (bytes memory) {
        return abi.encode(curvePool, tokenIndexInCurve, convexPoolId);
    }

    function decodeEntryParams(bytes calldata data)
        public
        pure
        returns (
            address,
            IERC20,
            uint8,
            uint8,
            uint256
        )
    {
        return abi.decode(data, (address, IERC20, uint8, uint8, uint256));
    }

    function decodeExitParams(bytes calldata data)
        public
        pure
        returns (
            address,
            uint8,
            uint256
        )
    {
        return abi.decode(data, (address, uint8, uint256));
    }

    function exchangeAll(IERC20 fromCoin, IERC20 toCoin) private {
        if (fromCoin == toCoin) return;
        uint256 amount = IERC20(fromCoin).balanceOf(address(this));
        if (amount == 0) return;

        fromCoin.safeApprove(address(exchange), amount);
        exchange.exchange(address(fromCoin), address(toCoin), amount, 0);
    }

    function manageRewardsAndWithdraw(
        bool swapRewards,
        IERC20 outputCoin,
        address receiver
    ) private {
        if (swapRewards) {
            exchangeAll(cvxRewards, outputCoin);
            exchangeAll(crvRewards, outputCoin);
        } else {
            cvxRewards.safeTransfer(
                receiver,
                cvxRewards.balanceOf(address(this))
            );
            crvRewards.safeTransfer(
                receiver,
                crvRewards.balanceOf(address(this))
            );
        }

        outputCoin.safeTransfer(receiver, outputCoin.balanceOf(address(this)));
    }

    function getCvxRewardPool(uint256 poolId)
        private
        view
        returns (ICvxBaseRewardPool)
    {
        (, , , address pool, , ) = cvxBooster.poolInfo(poolId);
        return ICvxBaseRewardPool(pool);
    }

    function getLpToken(uint256 poolId) private view returns (IERC20) {
        (address token, , , , , ) = cvxBooster.poolInfo(poolId);
        return IERC20(token);
    }
}
