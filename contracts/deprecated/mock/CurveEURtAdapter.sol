// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;
import "./IExchangeAdapter.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";

// solhint-disable func-name-mixedcase
// solhint-disable var-name-mixedcase

interface ICurveEURt {
    function exchange_underlying(
        uint256 i,
        uint256 j,
        uint256 dx,
        uint256 min_dy
    ) external returns (uint256);

    function add_liquidity(uint256[4] memory amounts, uint256 min_mint_amount)
        external;

    function remove_liquidity_one_coin(
        uint256 token_amount,
        uint256 i,
        uint256 min_amount
    ) external returns (uint256);
}

contract CurveEURtAdapter {
    IERC20 public constant lpToken =
        IERC20(0x600743B1d8A96438bD46836fD34977a00293f6Aa); //Curve EURT-3Crv (crvEURTUSD)

    function indexByCoin(address coin) public pure returns (uint256) {
        if (coin == 0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f) return 1; // EURt polygon
        if (coin == 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063) return 2; // dai polygon
        if (coin == 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174) return 3; // usdc polygon
        if (coin == 0xc2132D05D31c914a87C6611C10748AEb04B58e8F) return 4; // usdt polygon
        return 0;
    }

    // 0x6012856e  =>  executeSwap(address,address,address,uint256)
    function executeSwap(
        address pool,
        address fromToken,
        address toToken,
        uint256 amount
    ) external payable returns (uint256) {
        ICurveEURt curve = ICurveEURt(pool);
        uint256 i = indexByCoin(fromToken);
        uint256 j = indexByCoin(toToken);
        require(i != 0 && j != 0, "EURtAdapter: can't swap");

        return curve.exchange_underlying(i - 1, j - 1, amount, 0);
    }

    // 0xe83bbb76  =>  enterPool(address,address,address,uint256)
    function enterPool(
        address pool,
        address fromToken,
        uint256 amount
    ) external payable returns (uint256) {
        ICurveEURt curve = ICurveEURt(pool);
        uint256[4] memory amounts;
        uint256 i = indexByCoin(fromToken);
        require(i != 0, "EURtAdapter: can't enter");

        amounts[i - 1] = amount;

        curve.add_liquidity(amounts, 0);

        return lpToken.balanceOf(address(this));
    }

    // 0x9d756192  =>  exitPool(address,address,address,uint256)
    function exitPool(
        address pool,
        address toToken,
        uint256 amount
    ) external payable returns (uint256) {
        ICurveEURt curve = ICurveEURt(pool);

        uint256 i = indexByCoin(toToken);
        require(i != 0, "EURtAdapter: can't exit");

        return curve.remove_liquidity_one_coin(amount, i - 1, 0);

        // return IERC20(toToken).balanceOf(address(this));
    }
}