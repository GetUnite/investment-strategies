// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat/console.sol";

import "./../../IAlluoStrategyV2.sol";
import "../../interfaces/IExchange.sol";
import "./interfaces/ICvxBooster.sol";
import "./interfaces/ICvxBaseRewardPool.sol";
import "./interfaces/IFraxFarmERC20.sol";
import "./interfaces/IConvexWrapper.sol";
import "../../interfaces/ICurvePool.sol";
import "./interfaces/IPriceFeedRouterV2.sol";

contract CurveFraxConvexStrategyV2 is
    IAlluoStrategyV2,
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using AddressUpgradeable for address;
    using SafeERC20 for IERC20;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    address public priceFeed;

    ICvxBooster public constant CVX_BOOSTER =
        ICvxBooster(0xF403C135812408BFbE8713b5A23a04b3D48AAE31);
    IExchange public constant EXCHANGE =
        IExchange(0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec);
    IERC20 public constant CVX_REWARDS =
        IERC20(0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B);
    IERC20 public constant CRV_REWARDS =
        IERC20(0xD533a949740bb3306d119CC777fa900bA034cd52);

    bool public upgradeStatus;
    uint8 public constant unwindDecimals = 2;

    mapping(address => bytes32) public kek_ids;

    event Locked(
        address indexed locker,
        address indexed pool,
        bytes32 indexed kek_id
    );

    // constructor() initializer {}

    function initialize(
        address _multiSigWallet,
        address _voteExecutor,
        address _strategyHandler,
        address _priceFeed
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        // require(_multiSigWallet.isContract(), "Executor: Not contract");
        priceFeed = _priceFeed;
        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, _voteExecutor);
        _grantRole(DEFAULT_ADMIN_ROLE, _strategyHandler);

        _grantRole(UPGRADER_ROLE, _multiSigWallet);

        // For tests only
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    /// @notice Enters a Curve Pool and stakes LP tokens into FraxConvex
    /// @param data Payload containing necessary information to enter a curve pool and stake into frax convex
    /// @param amount Amount of poolToken to enter curve with

    function invest(bytes calldata data, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        (
            address curvePool,
            address poolToken,
            uint8 poolSize,
            uint8 tokenIndexInCurve,
            address fraxPool,
            uint256 duration
        ) = decodeEntryParams(data);

        // prepare amounts array for curve
        uint256[4] memory fourPoolTokensAmount;
        fourPoolTokensAmount[tokenIndexInCurve] = amount;

        // approve tokens to curve pool
        IERC20(poolToken).safeIncreaseAllowance(curvePool, amount);
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
        curvePool.functionCall(curveCall);

        address stakeToken = IFraxFarmERC20(fraxPool).stakingToken();
        address crvLpToken = ICurvePool(curvePool).lp_token();

        uint256 crvLpAmount = IERC20(crvLpToken).balanceOf(address(this));
        IERC20(crvLpToken).safeIncreaseAllowance(
            address(stakeToken),
            crvLpAmount
        );
        // Deposit these crvLptokens into the convex wrapper to get staked fraxLP tokens
        IConvexWrapper(address(stakeToken)).deposit(crvLpAmount, address(this));
        uint256 fraxLpAmount = IERC20(stakeToken).balanceOf(address(this));
        IERC20(stakeToken).safeIncreaseAllowance(fraxPool, fraxLpAmount);
        // Now stake and lock these LP tokens into the frax farm.

        //check if we have a position there already
        IFraxFarmERC20.LockedStake[] memory lockedstakes = IFraxFarmERC20(
            fraxPool
        ).lockedStakesOf(address(this));

        if (lockedstakes.length == 1) {
            bytes32 kek_id = lockedstakes[0].kek_id;
            IFraxFarmERC20(fraxPool).lockAdditional(kek_id, fraxLpAmount);
        } else if (lockedstakes.length == 0) {
            bytes32 kek_id;
            kek_id = IFraxFarmERC20(fraxPool).stakeLocked(
                fraxLpAmount,
                duration
            );
            kek_ids[fraxPool] = kek_id;
        }

        emit Locked(address(this), fraxPool, kek_ids[fraxPool]);
    }

    /// @notice Exits a specific position with a percentage, with additional options
    /// @dev This is called by the VoteExecutor to leave a specific frax convex position, with logic to handle rewards.
    /// @param data contains all the necessary data to exit a frax convex pool
    /// @param unwindPercent percentage of the position to unwind
    /// @param outputCoin IERC20
    /// @param receiver recipient of residual funds
    /// @param shouldWithdrawRewards bool to decide whether funds should be claimed from frax convex
    /// @param swapRewards bool to decide whether rewards should be swapped into a specific token

    function exitAll(
        bytes calldata data,
        uint256 unwindPercent,
        IERC20 outputCoin,
        address receiver,
        bool shouldWithdrawRewards,
        bool swapRewards
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        (
            address curvePool,
            address poolToken,
            // IERC20 crvLpToken,
            uint8 tokenIndexInCurve,
            address fraxPool
        ) = decodeExitParams(data);

        // withdraw locked stake and receive all rewards
        bytes32 kek_id = kek_ids[fraxPool];
        IFraxFarmERC20(fraxPool).withdrawLocked(kek_id, address(this));

        address stakeToken = IFraxFarmERC20(fraxPool).stakingToken();

        // exchange and send to the receiver
        _manageFraxRewards(fraxPool, swapRewards, outputCoin, receiver);

        // Get rewards from Convex
        IConvexWrapper(stakeToken).getReward(address(this));

        // withdraw staking Lp tokens from frax pool
        uint256 lpAmount;
        lpAmount =
            (IERC20(stakeToken).balanceOf(address(this)) * unwindPercent) /
            10000;
        IConvexWrapper(stakeToken).withdrawAndUnwrap(lpAmount);

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
        _exchangeAll(IERC20(poolToken), IERC20(outputCoin));
        if (shouldWithdrawRewards) {
            _manageRewardsAndWithdraw(
                swapRewards,
                IERC20(outputCoin),
                receiver
            );
        } else {
            outputCoin.safeTransfer(
                receiver,
                outputCoin.balanceOf(address(this))
            );
        }
    }

    /// @notice Manages all the rewards received from frax pool
    function _manageFraxRewards(
        address fraxPool,
        bool swapRewards,
        IERC20 outputCoin,
        address receiver
    ) internal {
        // exchange the rewards and send to the reciever
        address[] memory fraxPoolRewards = IFraxFarmERC20(fraxPool)
            .getAllRewardTokens();
        for (uint256 i; i < fraxPoolRewards.length; i++) {
            if (swapRewards) {
                _exchangeAll(IERC20(fraxPoolRewards[i]), outputCoin);
            } else {
                IERC20(fraxPoolRewards[i]).safeTransfer(
                    receiver,
                    IERC20(fraxPoolRewards[i]).balanceOf(address(this))
                );
            }
        }
    }

    function exitOnlyRewards(
        bytes calldata data,
        address outputCoin,
        address receiver,
        bool swapRewards
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        (, , , address fraxPool) = decodeExitParams(data);

        // Get rewards from Frax
        IFraxFarmERC20(fraxPool).getReward(address(this));
        _manageFraxRewards(fraxPool, swapRewards, IERC20(outputCoin), receiver);

        // Get rewards from Convex
        address stakeToken = IFraxFarmERC20(fraxPool).stakingToken();
        IConvexWrapper(stakeToken).getReward(address(this));
        withdrawRewards(outputCoin);
    }

    /// @notice Calculates the current LP position in Convex in terms of a specific asset and claims rewards
    /// @dev Called by the Vote Executor, this is used in the process of calculating the current position in Convex for Alluo staking reward calculations
    /// @param data Contains Convex pool data as well as the asset the function should return the value in.
    /// @return uint256 amount of the position valued in assetId price.
    function getDeployedAmountAndRewards(bytes calldata data)
        external
        returns (uint256)
    {
        (
            address lpToken,
            address fraxPool,
            uint256 assetId
        ) = decodeRewardsParams(data);

        // calculate frax rewards
        IFraxFarmERC20(fraxPool).getReward(address(this));

        // uint256 fraxRewards;
        // address[] memory fraxPoolRewards = IFraxFarmERC20(fraxPool)
        //     .getAllRewardTokens();
        // for (uint256 i; i < fraxPoolRewards.length; i++) {
        //     (uint256 fiatPrice, uint8 fiatDecimals) = IPriceFeedRouterV2(
        //         priceFeed
        //     ).getPriceOfAmount(
        //             address(fraxPoolRewards[i]),
        //             IERC20(fraxPoolRewards[i]).balanceOf(address(this)),
        //             assetId
        //         );
        //     fraxRewards += IPriceFeedRouterV2(priceFeed).decimalsConverter(
        //         fiatPrice,
        //         fiatDecimals,
        //         18
        //     );
        // }

        // calculate curve LP tokens and convex rewards
        // TODO: add calculation of rewards into the current position
        address stakeToken = IFraxFarmERC20(fraxPool).stakingToken();
        uint256 convexPoolId = IConvexWrapper(stakeToken).convexPoolId();
        // uint256 curveRewards;
        // if (convexPoolId != type(uint256).max) {
        //     ICvxBaseRewardPool rewards = getCvxRewardPool(convexPoolId);
        //     rewards.getReward(address(this), true);
        //     (uint256 fiatPrice, uint8 fiatDecimals) = IPriceFeedRouterV2(priceFeed)
        //     .getPriceOfAmount(address(rewards), lpAmount, assetId);
        //     curveRewards += IPriceFeedRouterV2(priceFeed).decimalsConverter(
        //         fiatPrice,
        //         fiatDecimals,
        //         18
        //     );
        // }

        // lpAmount = rewards.balanceOf(address(this));

        uint256 lpAmount;
        if (convexPoolId != type(uint256).max) {
            ICvxBaseRewardPool rewards = getCvxRewardPool(convexPoolId);
            lpAmount = rewards.balanceOf(address(this)); // this will not give us the current LP position
            rewards.getReward(address(this), true);
        } else {
            lpAmount = IERC20(stakeToken).balanceOf(address(this));
        }

        (uint256 fiatPrice, uint8 fiatDecimals) = IPriceFeedRouterV2(priceFeed)
            .getPriceOfAmount(address(lpToken), lpAmount, assetId);

        return
            IPriceFeedRouterV2(priceFeed).decimalsConverter(
                fiatPrice,
                fiatDecimals,
                18
            );
    }

    /// @notice Similar to getDeployedAmountandRewards, but doesn't claim rewards
    /// @dev Used as a view function to track positions
    /// @param data contains information of the frax pool and the assetId to return the value of the position.
    /// @return value of the current position described by data
    function getDeployedAmount(bytes calldata data)
        external
        view
        returns (uint256)
    {
        (
            address lpToken,
            address fraxPool,
            uint256 assetId
        ) = decodeRewardsParams(data);

        uint256 lpAmount;
        address stakeToken = IFraxFarmERC20(fraxPool).stakingToken();
        uint256 convexPoolId = IConvexWrapper(stakeToken).convexPoolId();

        if (convexPoolId != type(uint256).max) {
            ICvxBaseRewardPool rewards = getCvxRewardPool(convexPoolId);
            lpAmount = rewards.balanceOf(address(this));
        } else {
            lpAmount = IERC20(lpToken).balanceOf(address(this));
        }
        (uint256 fiatPrice, uint8 fiatDecimals) = IPriceFeedRouterV2(priceFeed)
            .getPriceOfAmount(address(lpToken), lpAmount, assetId);
        return
            IPriceFeedRouterV2(priceFeed).decimalsConverter(
                fiatPrice,
                fiatDecimals,
                18
            );
    }

    /// @notice Swaps rewards to "token" and sends it to the Vote Executor
    /// @dev Swaps existing rewards already claimed to the token. This does not claim from convex.
    /// @param _token The token we expect to receive rewards in
    function withdrawRewards(address _token)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _manageRewardsAndWithdraw(true, IERC20(_token), msg.sender);
    }

    function _exchangeAll(IERC20 fromCoin, IERC20 toCoin) private {
        if (fromCoin == toCoin) return;
        uint256 amount = IERC20(fromCoin).balanceOf(address(this));
        if (amount == 0) return;

        fromCoin.safeApprove(address(EXCHANGE), amount);
        EXCHANGE.exchange(address(fromCoin), address(toCoin), amount, 0);
    }

    function _manageRewardsAndWithdraw(
        bool swapRewards,
        IERC20 outputCoin,
        address receiver
    ) private {
        if (swapRewards) {
            _exchangeAll(CVX_REWARDS, outputCoin);
            _exchangeAll(CRV_REWARDS, outputCoin);
        } else {
            IERC20(CVX_REWARDS).safeTransfer(
                receiver,
                CVX_REWARDS.balanceOf(address(this))
            );
            IERC20(CRV_REWARDS).safeTransfer(
                receiver,
                CRV_REWARDS.balanceOf(address(this))
            );
        }
        IERC20(outputCoin).safeTransfer(
            receiver,
            outputCoin.balanceOf(address(this))
        );
    }

    function multicall(
        address[] calldata destinations,
        bytes[] calldata calldatas
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = destinations.length;
        require(length == calldatas.length, "FraxConvexStrategyV2: lengths");
        for (uint256 i = 0; i < length; i++) {
            destinations[i].functionCall(calldatas[i]);
        }
    }

    function getCvxRewardPool(uint256 poolId)
        private
        view
        returns (ICvxBaseRewardPool)
    {
        (, , , address pool, , ) = CVX_BOOSTER.poolInfo(poolId);
        return ICvxBaseRewardPool(pool);
    }

    function encodeEntryParams(
        address curvePool,
        address poolToken,
        uint8 poolSize,
        uint8 tokenIndexInCurve,
        address fraxPool,
        uint256 duration
    ) external pure returns (bytes memory) {
        return
            abi.encode(
                curvePool,
                poolToken,
                poolSize,
                tokenIndexInCurve,
                fraxPool,
                duration
            );
    }

    function encodeExitParams(
        address curvePool,
        address poolToken,
        uint8 tokenIndexInCurve,
        address fraxPool
    ) public pure returns (bytes memory) {
        return abi.encode(curvePool, poolToken, tokenIndexInCurve, fraxPool);
    }

    function decodeEntryParams(bytes calldata data)
        public
        pure
        returns (
            address,
            address,
            uint8,
            uint8,
            address,
            uint256
        )
    {
        require(data.length == 32 * 6, "FraxConvexStrategyV2: length en");
        return
            abi.decode(
                data,
                (address, address, uint8, uint8, address, uint256)
            );
    }

    function decodeExitParams(bytes calldata data)
        public
        pure
        returns (
            address,
            address,
            uint8,
            address
        )
    {
        require(data.length == 32 * 4, "FraxConvexStrategyV2: length ex");
        return abi.decode(data, (address, address, uint8, address));
    }

    function encodeRewardsParams(
        address lpToken,
        address fraxPool,
        uint256 assetId
    ) public pure returns (bytes memory) {
        return abi.encode(lpToken, fraxPool, assetId);
    }

    function decodeRewardsParams(bytes calldata data)
        public
        pure
        returns (
            address,
            address,
            uint256
        )
    {
        require(data.length == 32 * 3, "FraxConvexStrategyV2: length ex");
        return abi.decode(data, (address, address, uint256));
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {
        require(upgradeStatus, "FraxConvexStrategyV2: Upgrade not allowed");
        upgradeStatus = false;
    }
}
