// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat/console.sol";

import "./../../IAlluoStrategyV2.sol";
import "../../interfaces/IExchange.sol";
import "./interfaces/IFraxFarmERC20.sol";
import "./interfaces/IConvexWrapper.sol";

contract CurveFraxConvexStrategyETH is
    IAlluoStrategyV2,
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using AddressUpgradeable for address;
    using SafeERC20 for IERC20;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    address public priceFeed;

    IExchange public constant EXCHANGE =
        IExchange(0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec);
    IERC20 public constant crvRewards =
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

    receive() external payable {}

    function invest(bytes calldata data, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        (
            address curvePool,
            IERC20 crvLpToken,
            IERC20 poolToken,
            uint8 poolSize,
            uint8 tokenIndexInCurve,
            IERC20 stakeToken,
            address fraxPool,
            uint256 duration
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

        uint256 crvLpAmount = crvLpToken.balanceOf(address(this));
        crvLpToken.safeIncreaseAllowance(address(stakeToken), crvLpAmount);
        // Deposit these crvLptokens into the convex wrapper to get staked fraxLP tokens
        IConvexWrapper(address(stakeToken)).deposit(crvLpAmount, address(this));
        uint256 fraxLpAmount = stakeToken.balanceOf(address(this));
        stakeToken.safeIncreaseAllowance(fraxPool, fraxLpAmount);
        // Now stake and lock these LP tokens into the frax farm.

        //check if we have a position there already
        IFraxFarmERC20.LockedStake[] memory lockedstakes = IFraxFarmERC20(
            fraxPool
        ).lockedStakesOf(address(this));

        if (lockedstakes.length == 1) {
            bytes32 kek_id = lockedstakes[0].kek_id;
            IFraxFarmERC20(fraxPool).lockAdditional(
                kek_ids[fraxPool],
                fraxLpAmount
            );
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
            IERC20 poolToken,
            IERC20 crvLpToken,
            uint8 tokenIndexInCurve,
            address fraxPool
        ) = decodeExitParams(data);
        uint256 lpAmount;

        bytes32 kek_id = kek_ids[fraxPool];
        // withdraw locked stake and receive all rewards
        IFraxFarmERC20(fraxPool).withdrawLocked(kek_id, address(this));

        _manageRewards(fraxPool, swapRewards, outputCoin, receiver);

        // Get rewards from Convex
        IConvexWrapper(IFraxFarmERC20(fraxPool).stakingToken()).getReward(
            address(this)
        );

        // withdraw staking Lp tokens from frax pool
        lpAmount =
            (IERC20(IFraxFarmERC20(fraxPool).stakingToken()).balanceOf(
                address(this)
            ) * unwindPercent) /
            (10**(2 + unwindDecimals));
        IConvexWrapper(IFraxFarmERC20(fraxPool).stakingToken())
            .withdrawAndUnwrap(lpAmount);

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
        manageRewardsAndWithdraw(
            swapRewards,
            IERC20(poolToken),
            IERC20(outputCoin),
            receiver
        );
    }

    function _manageRewards(
        address fraxPool,
        bool swapRewards,
        IERC20 outputCoin,
        address receiver
    ) internal {
        // exchange the rewards and send to the reciever
        address[] memory fraxPoolRewards = IFraxFarmERC20(fraxPool)
            .getAllRewardTokens();
        for (uint256 i; i < fraxPoolRewards.length; i++) {
            manageRewardsAndWithdraw(
                swapRewards,
                IERC20(fraxPoolRewards[i]),
                IERC20(outputCoin),
                receiver
            );
        }
    }

    function exitOnlyRewards(
        bytes calldata data,
        address outputCoin,
        address receiver,
        bool swapRewards
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        (, , , , address fraxPool) = decodeExitParams(data);

        // Get rewards from Frax
        IFraxFarmERC20(fraxPool).getReward(address(this));

        // Get rewards from Convex
        IConvexWrapper(IFraxFarmERC20(fraxPool).stakingToken()).getReward(
            address(this)
        ); // get crvRewards
        manageRewardsAndWithdraw(
            swapRewards,
            IERC20(crvRewards),
            IERC20(outputCoin),
            receiver
        );

        // Swap and send all rewards to receiver
        address[] memory fraxPoolRewards = IFraxFarmERC20(fraxPool)
            .getAllRewardTokens();
        for (uint256 i; i < fraxPoolRewards.length; i++) {
            manageRewardsAndWithdraw(
                swapRewards,
                IERC20(fraxPoolRewards[i]),
                IERC20(outputCoin),
                receiver
            );
        }
    }

    function getDeployedAmount(bytes calldata data)
        external
        view
        returns (uint256)
    {}

    function withdrawRewards(address _token) external {}

    function getDeployedAmountAndRewards(bytes calldata data)
        external
        returns (uint256)
    {}

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

    function decodeRewardsParams(bytes calldata data)
        public
        pure
        returns (
            IERC20,
            uint256,
            uint256
        )
    {
        require(data.length == 32 * 3, "CurveFraxConvexStrategyV2: length ex");
        return abi.decode(data, (IERC20, uint256, uint256));
    }

    function encodeEntryParams(
        address curvePool,
        address crvLpToken,
        address poolToken,
        uint8 poolSize,
        uint8 tokenIndexInCurve,
        address stakeToken,
        address fraxPool,
        uint256 duration
    ) external pure returns (bytes memory) {
        return
            abi.encode(
                curvePool,
                crvLpToken,
                poolToken,
                poolSize,
                tokenIndexInCurve,
                stakeToken,
                fraxPool,
                duration
            );
    }

    function encodeExitParams(
        address curvePool,
        address poolToken,
        address crvLpToken,
        uint8 tokenIndexInCurve,
        address fraxPool
    ) public pure returns (bytes memory) {
        return
            abi.encode(
                curvePool,
                poolToken,
                crvLpToken,
                tokenIndexInCurve,
                fraxPool
            );
    }

    function decodeEntryParams(bytes calldata data)
        public
        pure
        returns (
            address,
            IERC20,
            IERC20,
            uint8,
            uint8,
            IERC20,
            address,
            uint256
        )
    {
        require(data.length == 32 * 8, "CurveConvexStrategy: length en");
        return
            abi.decode(
                data,
                (
                    address,
                    IERC20,
                    IERC20,
                    uint8,
                    uint8,
                    IERC20,
                    address,
                    uint256
                )
            );
    }

    function decodeExitParams(bytes calldata data)
        public
        pure
        returns (
            address,
            IERC20,
            IERC20,
            uint8,
            address
        )
    // bytes32
    {
        require(data.length == 32 * 5, "CurveFraxConvexStrategyV2: length ex");
        return abi.decode(data, (address, IERC20, IERC20, uint8, address));
    }

    function exchangeAll(IERC20 fromCoin, IERC20 toCoin) private {
        if (fromCoin == toCoin) return;
        uint256 amount = IERC20(fromCoin).balanceOf(address(this));
        if (amount == 0) return;

        fromCoin.safeApprove(address(EXCHANGE), amount);
        EXCHANGE.exchange(address(fromCoin), address(toCoin), amount, 0);
    }

    function manageRewardsAndWithdraw(
        bool swapRewards,
        IERC20 rewardToken,
        IERC20 outputCoin,
        address receiver
    ) private {
        if (swapRewards) {
            exchangeAll(rewardToken, outputCoin);
        } else {
            IERC20(rewardToken).safeTransfer(
                receiver,
                rewardToken.balanceOf(address(this))
            );
        }
        IERC20(outputCoin).safeTransfer(
            receiver,
            outputCoin.balanceOf(address(this))
        );
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {
        require(
            upgradeStatus,
            "CurveFraxConvexStrategyV2: Upgrade not allowed"
        );
        upgradeStatus = false;
    }
}
