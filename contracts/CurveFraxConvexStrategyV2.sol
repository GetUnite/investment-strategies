// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {IAlluoStrategyV2} from "./interfaces/IAlluoStrategyV2.sol";
import {ICvxBooster} from "./interfaces/ICvxBooster.sol";
import {ICvxBaseRewardPool} from "./interfaces/ICvxBaseRewardPool.sol";
import {IExchange} from "./interfaces/IExchange.sol";
import {IPriceFeedRouterV2} from "./interfaces/IPriceFeedRouterV2.sol";
import {IWrappedEther} from "./interfaces/IWrappedEther.sol";
import {IFraxFarmERC20} from "./interfaces/IFraxFarmERC20.sol";
import {ICurvePool} from "./interfaces/ICurvePool.sol";
import {IConvexWrapper} from "./interfaces/IConvexWrapper.sol";
import "hardhat/console.sol";

// import "hardhat/console.sol";

contract CurveFraxConvexStrategyV2 is
    IAlluoStrategyV2,
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using AddressUpgradeable for address;
    using SafeERC20 for IERC20;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    ICvxBooster public constant CVX_BOOSTER =
        ICvxBooster(0xF403C135812408BFbE8713b5A23a04b3D48AAE31);
    IExchange public constant EXCHANGE =
        IExchange(0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec);
    IERC20 public constant CVX_REWARDS =
        IERC20(0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B);
    IERC20 public constant CRV_REWARDS =
        IERC20(0xD533a949740bb3306d119CC777fa900bA034cd52);
    IERC20 public constant FXS_REWARDS =
        IERC20(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
    IWrappedEther public constant WETH =
        IWrappedEther(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    bool public upgradeStatus;
    address public priceFeed;

    EnumerableSetUpgradeable.AddressSet private additionalRewards;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    receive() external payable {}

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

    /// @notice Enters a Curve Pool that may use native ETH and stake it into Frax Convex for liquidity direction
    /// @dev Same logic as the CurveConvexStrategyV2, but with additional support for native ETH
    /// @param data Payload containing necessary information to enter a curve pool and stake into frax.convex
    /// @param amount Amount of poolToken to enter curve with
    function invest(
        bytes calldata data,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        (
            address curvePool,
            address poolToken,
            uint8 poolSize,
            uint8 tokenIndexInCurve,
            address fraxPool,
            uint256 duration
        ) = decodeEntryParams(data);

        address stakeToken = IFraxFarmERC20(fraxPool).stakingToken();
        address crvLpToken = ICurvePool(curvePool).lp_token();

        uint256 crvLpBalanceBefore = IERC20(crvLpToken).balanceOf(
            address(this)
        );
        uint256 stakeTokenBalanceBefore = IERC20(stakeToken).balanceOf(
            address(this)
        );

        // step 1 - swap from WETH to ETH if pool token is ETH
        if (
            ICurvePool(curvePool).coins(tokenIndexInCurve) ==
            0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
        ) {
            WETH.withdraw(amount);
        } else {
            IERC20(poolToken).safeIncreaseAllowance(curvePool, amount);
        }

        // step 2 - prepare amounts array for curve
        uint256[4] memory fourPoolTokensAmount;
        fourPoolTokensAmount[tokenIndexInCurve] = amount;

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

        // execute call - should send eth
        if (
            ICurvePool(curvePool).coins(tokenIndexInCurve) ==
            0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
        ) {
            curvePool.functionCallWithValue(curveCall, amount);
        } else {
            curvePool.functionCall(curveCall);
        }

        // step 3 - get the exact crvLpAmount worth of `amount` passed as a param, wrap them
        uint256 crvLpAmount = IERC20(crvLpToken).balanceOf(address(this)) -
            crvLpBalanceBefore;
        IERC20(crvLpToken).safeIncreaseAllowance(
            address(stakeToken),
            crvLpAmount
        );

        // Deposit these crvLptokens into the convex wrapper to get staked fraxLP tokens
        IConvexWrapper(address(stakeToken)).deposit(crvLpAmount, address(this));

        // get the exact fraxLpAmount worth of `amount` passed as a param
        uint256 fraxLpAmount = IERC20(stakeToken).balanceOf(address(this)) -
            stakeTokenBalanceBefore;
        IERC20(stakeToken).safeIncreaseAllowance(fraxPool, fraxLpAmount);

        // step 4 - stake and lock these LP tokens into the frax farm.
        // check if we have a position there already
        IFraxFarmERC20.LockedStake[] memory lockedstakes = IFraxFarmERC20(
            fraxPool
        ).lockedStakesOf(address(this));

        if (
            lockedstakes.length == 0 ||
            lockedstakes[lockedstakes.length - 1].ending_timestamp == 0
        ) {
            IFraxFarmERC20(fraxPool).stakeLocked(fraxLpAmount, duration);
        } else {
            bytes32 kek_id = lockedstakes[lockedstakes.length - 1].kek_id;
            IFraxFarmERC20(fraxPool).lockAdditional(kek_id, fraxLpAmount);
            IFraxFarmERC20(fraxPool).lockLonger(
                kek_id,
                block.timestamp + duration
            ); // lock_time_min = 594000 in frax pool
        }
    }

    function investLonger(
        address _fraxpool,
        uint256 newEndingTs
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IFraxFarmERC20.LockedStake[] memory lockedstakes = IFraxFarmERC20(
            _fraxpool
        ).lockedStakesOf(address(this));

        require(
            lockedstakes.length != 0,
            "CurveFraxConvexStrategyV2: !invested"
        );
        bytes32 kek_id = lockedstakes[lockedstakes.length - 1].kek_id;
        IFraxFarmERC20(_fraxpool).lockLonger(kek_id, newEndingTs);
    }

    /// @notice Exits a specific position with a percentage, with additional options
    /// @dev This is called by the VoteExecutor to leave a specific frax convex position, with logic to handle rewards.
    /// @param data contains all the necessary data to exit a convex pool
    /// @param unwindPercent percentage of the position to unwind
    /// @param outputCoin IERC20
    /// @param receiver recipient of residual funds
    /// @param shouldWithdrawRewards bool to decide whether funds should be claimed from convex
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
            uint8 tokenIndexInCurve,
            address fraxPool,
            bool lockRemaining,
            uint256 nextDuration
        ) = decodeExitParams(data);

        uint256 lpAmountToWithdraw = _withdrawFromFrax(
            fraxPool,
            unwindPercent,
            lockRemaining,
            nextDuration
        );
        if (lpAmountToWithdraw == 0) return;

        bytes memory curveCall = abi.encodeWithSignature(
            "remove_liquidity_one_coin(uint256,int128,uint256)",
            lpAmountToWithdraw,
            tokenIndexInCurve,
            0
        );

        if (
            ICurvePool(curvePool).coins(tokenIndexInCurve) ==
            0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
        ) {
            uint256 valueETH = address(this).balance;
            curvePool.functionCall(curveCall);
            valueETH = address(this).balance - valueETH;
            if (valueETH > 0) {
                IWrappedEther(WETH).deposit{value: valueETH}();
                poolToken = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
            }
        } else {
            curvePool.functionCall(curveCall);
        }

        _exchangeAll(IERC20(poolToken), IERC20(outputCoin));

        if (shouldWithdrawRewards) {
            _exitRewards(fraxPool, swapRewards, IERC20(outputCoin), receiver);
        } else {
            outputCoin.safeTransfer(
                receiver,
                outputCoin.balanceOf(address(this))
            );
        }
    }

    function _withdrawFromFrax(
        address _fraxPool,
        uint256 _unwindPercent,
        bool _lockRemaining,
        uint256 _nextDuration
    ) internal returns (uint256) {
        IFraxFarmERC20.LockedStake[] memory lockedstakes = IFraxFarmERC20(
            _fraxPool
        ).lockedStakesOf(address(this));
        require(
            lockedstakes.length != 0,
            "CurveFraxConvexStrategyV2: !investment"
        );

        // step 1 - unlock wrapped lp tokens
        IFraxFarmERC20(_fraxPool).withdrawLocked(
            lockedstakes[lockedstakes.length - 1].kek_id,
            address(this)
        );

        // step 2 - unwrap lp tokens
        address stakeToken = IFraxFarmERC20(_fraxPool).stakingToken();
        uint256 lpAmountToWithdraw = (lockedstakes[lockedstakes.length - 1]
            .liquidity * _unwindPercent) / 10000;

        if (lpAmountToWithdraw == 0) return 0;

        IConvexWrapper(stakeToken).withdrawAndUnwrap(lpAmountToWithdraw);

        // step 3 - lock unwrapped staking token
        if (_lockRemaining) {
            uint256 lpAmountToLock = IERC20(stakeToken).balanceOf(
                address(this)
            );
            if (lpAmountToLock != 0) {
                _lockInFraxPool(_fraxPool, lpAmountToLock, _nextDuration);
            }
        }
        return lpAmountToWithdraw;
    }

    function _lockInFraxPool(
        address _fraxPool,
        uint256 _amount,
        uint256 _duration
    ) internal {
        address stakeToken = IFraxFarmERC20(_fraxPool).stakingToken();
        IERC20(stakeToken).safeIncreaseAllowance(_fraxPool, _amount);
        IFraxFarmERC20(_fraxPool).stakeLocked(_amount, _duration);
    }

    /// @notice Locks wrapped curve Lp tokens into frax pool
    /// @param _fraxPool address of frax pool to lock tokens in
    /// @param _amount Amount of wrapped lp tokens to lock
    /// @param _duration Duration of locking period in sec, minimum is 594000 (approx 7 days)
    function lockInFraxPool(
        address _fraxPool,
        uint256 _amount,
        uint256 _duration
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _lockInFraxPool(_fraxPool, _amount, _duration);
    }

    /// @notice Calculates the current LP position in Convex in terms of a specific asset and claims rewards
    /// @dev Called by the Vote Executor, this is used in the process of calculating the current position in Convex for Alluo staking reward calculations
    /// @param data Contains Convex pool data as well as the asset the function should return the value in.
    /// @return uint256 amount of the position valued in assetId price.
    function getDeployedAmountAndRewards(
        bytes calldata data
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        (
            address lpToken,
            address fraxPool,
            uint256 assetId
        ) = decodeRewardsParams(data);

        uint256 liquidity = IFraxFarmERC20(fraxPool).lockedLiquidityOf(
            address(this)
        );
        address stakeToken = IFraxFarmERC20(fraxPool).stakingToken();

        // claim rewards
        IFraxFarmERC20(fraxPool).getReward(address(this));
        IConvexWrapper(stakeToken).getReward(address(this));

        (uint256 fiatPrice, uint8 fiatDecimals) = IPriceFeedRouterV2(priceFeed)
            .getPriceOfAmount(lpToken, liquidity, assetId);

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
    function withdrawRewards(
        address _token
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _manageRewardsAndWithdraw(true, IERC20(_token), msg.sender);
    }

    /// @notice Only claims rewards and swaps them to the output coin
    /// @dev Used when exit delta is 0.
    /// @param data Contains Convex data
    /// @param outputCoin Token to receive rewards in.
    /// @param receiver Recipient of the rewards.
    /// @param swapRewards Whether to swap rewards into the output coin.
    function exitOnlyRewards(
        bytes calldata data,
        address outputCoin,
        address receiver,
        bool swapRewards
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        (, , , address fraxPool, , ) = decodeExitParams(data);

        // Get rewards from Frax
        IFraxFarmERC20(fraxPool).getReward(address(this));
        _exitRewards(fraxPool, swapRewards, IERC20(outputCoin), receiver);
    }

    function _exitRewards(
        address fraxPool,
        bool swapRewards,
        IERC20 outputCoin,
        address receiver
    ) internal {
        // Get rewards from Convex
        address stakeToken = IFraxFarmERC20(fraxPool).stakingToken();
        IConvexWrapper(stakeToken).getReward(address(this));
        _manageRewardsAndWithdraw(swapRewards, IERC20(outputCoin), receiver);
    }

    /// @notice Used to track any additional rewards we need to keep track of.
    /// @dev Important when claiming/ swapping all rewards to output coin
    /// @param _newToken token address to add/remove
    /// @param _status whether to add or remove
    function changeAdditionalRewardTokenStatus(
        address _newToken,
        bool _status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_status) {
            additionalRewards.add(_newToken);
        } else {
            additionalRewards.remove(_newToken);
        }
    }

    /// @notice Similar to getDeployedAmountandRewards, but doesn't claim rewards
    /// @dev Used as a view function to track positions
    /// @param data contains information of the convex pool and the assetId to return the value of the position.
    /// @return value of the current position described by data
    function getDeployedAmount(
        bytes calldata data
    ) external view returns (uint256) {
        (
            address lpToken, // can be acceesed as IConvexStaking(IFraxFarmERC20(frax).stakingToken()).curvetoken()
            address fraxPool,
            uint256 assetId
        ) = decodeRewardsParams(data);

        uint256 lpAmount = IFraxFarmERC20(fraxPool).lockedLiquidityOf(
            address(this)
        );

        (uint256 fiatPrice, uint8 fiatDecimals) = IPriceFeedRouterV2(priceFeed)
            .getPriceOfAmount(lpToken, lpAmount, assetId);
        return
            IPriceFeedRouterV2(priceFeed).decimalsConverter(
                fiatPrice,
                fiatDecimals,
                18
            );
    }

    /// @notice Exchanges the fromCoin to the toCoin
    /// @dev Explain to a developer any extra details
    /// @param fromCoin IERC20
    /// @param toCoin  IERC20
    function _exchangeAll(IERC20 fromCoin, IERC20 toCoin) internal {
        if (fromCoin == toCoin) return;
        uint256 amount = IERC20(fromCoin).balanceOf(address(this));
        if (amount == 0) return;

        fromCoin.safeApprove(address(EXCHANGE), amount);
        EXCHANGE.exchange(address(fromCoin), address(toCoin), amount, 0);
    }

    /// @notice Swaps all rewards if instructed to the output coin and sends the funds to the receiver
    /// @param swapRewards bool to swap or not
    /// @param outputCoin IERC20
    /// @param receiver receiver of the funds
    function _manageRewardsAndWithdraw(
        bool swapRewards,
        IERC20 outputCoin,
        address receiver
    ) internal {
        if (swapRewards) {
            _exchangeAll(CVX_REWARDS, outputCoin);
            _exchangeAll(CRV_REWARDS, outputCoin);
            _exchangeAll(FXS_REWARDS, outputCoin);

            uint256 additionalRewardsLength = additionalRewards.length();
            if (additionalRewardsLength != 0) {
                for (uint256 i; i < additionalRewardsLength; i++) {
                    _exchangeAll(IERC20(additionalRewards.at(i)), outputCoin);
                }
            }
        } else {
            CVX_REWARDS.safeTransfer(
                receiver,
                CVX_REWARDS.balanceOf(address(this))
            );
            CRV_REWARDS.safeTransfer(
                receiver,
                CRV_REWARDS.balanceOf(address(this))
            );
            FXS_REWARDS.safeTransfer(
                receiver,
                FXS_REWARDS.balanceOf(address(this))
            );

            uint256 additionalRewardsLength = additionalRewards.length();
            if (additionalRewardsLength != 0) {
                for (uint256 i; i < additionalRewardsLength; i++) {
                    address token = additionalRewards.at(i);
                    IERC20(token).safeTransfer(
                        receiver,
                        IERC20(token).balanceOf(address(this))
                    );
                }
            }
        }

        outputCoin.safeTransfer(receiver, outputCoin.balanceOf(address(this)));
    }

    function multicall(
        address[] calldata destinations,
        bytes[] calldata calldatas
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = destinations.length;
        require(
            length == calldatas.length,
            "CurveFraxConvexStrategyV2: lengths"
        );
        for (uint256 i = 0; i < length; i++) {
            destinations[i].functionCall(calldatas[i]);
        }
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
        address fraxPool,
        bool lockRemaining,
        uint256 nextDuration
    ) public pure returns (bytes memory) {
        return
            abi.encode(
                curvePool,
                poolToken,
                tokenIndexInCurve,
                fraxPool,
                lockRemaining,
                nextDuration
            );
    }

    function decodeEntryParams(
        bytes calldata data
    ) public pure returns (address, address, uint8, uint8, address, uint256) {
        require(data.length == 32 * 6, "FraxConvexStrategyV2: length en");
        return
            abi.decode(
                data,
                (address, address, uint8, uint8, address, uint256)
            );
    }

    function decodeExitParams(
        bytes calldata data
    ) public pure returns (address, address, uint8, address, bool, uint256) {
        require(data.length == 32 * 6, "FraxConvexStrategyV2: length ex");
        return
            abi.decode(data, (address, address, uint8, address, bool, uint256));
    }

    function encodeRewardsParams(
        address lpToken,
        address fraxPool,
        uint256 assetId
    ) public pure returns (bytes memory) {
        return abi.encode(lpToken, fraxPool, assetId);
    }

    function decodeRewardsParams(
        bytes calldata data
    ) public pure returns (address, address, uint256) {
        require(data.length == 32 * 3, "FraxConvexStrategyV2: length ex");
        return abi.decode(data, (address, address, uint256));
    }

    function grantRole(
        bytes32 role,
        address account
    ) public override onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    function changeUpgradeStatus(
        bool _status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        upgradeStatus = _status;
    }

    function _authorizeUpgrade(
        address
    ) internal override onlyRole(UPGRADER_ROLE) {
        require(upgradeStatus, "Executor: Upgrade not allowed");
        upgradeStatus = false;
    }
}
