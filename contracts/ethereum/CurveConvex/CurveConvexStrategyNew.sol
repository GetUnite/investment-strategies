// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

import "./interfaces/ICvxBooster.sol";
import "./interfaces/ICvxBaseRewardPool.sol";
import "../../interfaces/IExchange.sol";

contract CurveConvexStrategy is AccessControl {
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

    constructor(
        address voteExecutor,
        address gnosis
    ) {
        require(
            voteExecutor.isContract(),
            "CurveConvexStrategy: 1!contract"
        );
        require(gnosis.isContract(), "CurveConvexStrategy: 2!contract");
        _grantRole(DEFAULT_ADMIN_ROLE, gnosis);
        _grantRole(DEFAULT_ADMIN_ROLE, voteExecutor);
    }

    // need to add reward swapping 
    // function invest(bytes calldata data, uint256 amount, bool swapRewards)
    function invest(bytes calldata data, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        (
            address curvePool,
            //we can actually remove poolToken by calling coins()
            // but sometimes it calls underlying_coins()
            IERC20 poolToken,
            uint8 poolSize,
            uint8 tokenIndexInCurve,
            uint256 convexPoolId
        ) = decodeData(data);

        // prepare amounts array for curve
        uint256[4] memory fourPoolTokensAmount;
        fourPoolTokensAmount[tokenIndexInCurve] = amount;

        // approve tokens to curve pool
        poolToken.safeIncreaseAllowance(curvePool, amount);

        // encode call to curve - this ugly code handles different curve pool
        // sizes and function selectors
        bytes memory curveCall;
        if (poolSize == 2) {
            curveCall = abi.encodeWithSelector(
                0x0b4c7e4d,
                uint256[2]([fourPoolTokensAmount[0], fourPoolTokensAmount[1]]),
                0
            );
        } else if (poolSize == 3) {
            curveCall = abi.encodeWithSelector(
                0x4515cef3,
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
            curveCall = abi.encodeWithSelector(
                0x029b2f34,
                fourPoolTokensAmount,
                0
            );
        }

        // execute call
        bytes memory lpAmountEncoded = curvePool.functionCall(curveCall);

        uint256 lpAmount = abi.decode(lpAmountEncoded, (uint256));

        // skip investment in convex, if convexPoolId is uint256 max value
        if (convexPoolId != type(uint256).max) {
            // invest tokens to convex
            (address lptoken,,,,,) = cvxBooster.poolInfo(convexPoolId);
            IERC20(lptoken).safeIncreaseAllowance(address(cvxBooster), lpAmount);
            cvxBooster.deposit(convexPoolId, lpAmount, true);
        }

        //manageRewardsAndWithdraw(swapRewards, IERC20(outputCoin), receiver);
    }

    function exit(
        bytes calldata data,
        uint256 unwindAmount,
        // address outputCoin, bool swapRewards
        address outputCoin
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {

        (
            address curvePool,
            IERC20 poolToken,
            uint8 poolSize,
            uint8 tokenIndexInCurve,
            uint256 convexPoolId
        ) = decodeData(data);
        
        bytes memory curveCall;

        // prepare amounts array for curve
        uint256[4] memory fourPoolTokensAmount;
        fourPoolTokensAmount[tokenIndexInCurve] = unwindAmount;

        // encode call to curve - this ugly code handles different curve pool
        // sizes and function selectors
        // remove_liquidity_imbalance()
        if (poolSize == 2) {
            curveCall = abi.encodeWithSelector(
                0x3cd394c3,
                uint256[2]([fourPoolTokensAmount[0], fourPoolTokensAmount[1]]),
                //is it ok to use that or better max uint? 
                unwindAmount * 102 / 100
            );
        } else if (poolSize == 3) {
            curveCall = abi.encodeWithSelector(
                0x6d45a103,
                uint256[3](
                    [
                        fourPoolTokensAmount[0],
                        fourPoolTokensAmount[1],
                        fourPoolTokensAmount[2]
                    ]
                ),
                unwindAmount * 102 / 100
            );
        } else {
            curveCall = abi.encodeWithSelector(
                0x73463b36,
                fourPoolTokensAmount,
                unwindAmount * 102 / 100
            );
        }

        // idk will it work or no
        bytes memory lpAmountEncoded = curvePool.functionCall(curveCall);

        uint256 lpAmount = abi.decode(lpAmountEncoded, (uint256));

        if (convexPoolId != type(uint256).max) {


            ICvxBaseRewardPool rewards = getCvxRewardPool(convexPoolId);

            // withdraw Curve LPs and all rewards
            rewards.withdrawAndUnwrap(lpAmount, true);
        }

        if (lpAmount == 0) return;

        // exit with coin that we used for entry
        curveCall = abi.encodeWithSignature(
            "remove_liquidity_one_coin(uint256,int128,uint256)",
            lpAmount,
            tokenIndexInCurve,
            0
        );
        curvePool.functionCall(curveCall);

        // execute exchanges and transfer all tokens to receiver
        exchangeAll(poolToken, IERC20(outputCoin));
        // manageRewardsAndWithdraw(swapRewards, IERC20(outputCoin), msg.sender);
    }

    function exitOnlyRewards(
        bytes calldata data,
        address outputCoin,
        address receiver,
        bool swapRewards
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        (, , , , uint256 convexPoolId) = decodeData(data);
        ICvxBaseRewardPool rewards = getCvxRewardPool(convexPoolId);
        rewards.getReward(address(this), true);

        manageRewardsAndWithdraw(swapRewards, IERC20(outputCoin), receiver);
    }

    function multicall(
        address[] calldata destinations,
        bytes[] calldata calldatas
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = destinations.length;
        require(length == calldatas.length, "CurveConvexStrategy: lengths");
        for (uint256 i = 0; i < length; i++) {
            destinations[i].functionCall(calldatas[i]);
        }
    }

    function encodeData(
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

    function decodeData(bytes calldata data)
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
        require(data.length == 32 * 5, "CurveConvexStrategy: length en");
        return
            abi.decode(data, (address, IERC20, uint8, uint8, uint256));
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
}