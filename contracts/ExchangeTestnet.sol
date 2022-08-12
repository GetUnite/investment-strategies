// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./Token.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ExchangeTestnet is Ownable {
    mapping(address => mapping(address => uint256)) public prices;

    function exchange(
        address from,
        address to,
        uint256 amountIn,
        uint256 minAmountOut
    ) external payable returns (uint256) {
        Token(from).burn(msg.sender, amountIn);

        uint8 decimalsIn = Token(from).decimals();
        uint256 price = prices[from][to];

        uint256 mintAmount = (amountIn * price) / (10**decimalsIn);
        require(mintAmount >= minAmountOut, "Exchange: slippage");

        Token(to).mint(msg.sender, mintAmount);
        return mintAmount;
    }

    // Given 1.0 of any `_inputToken` with any amount of decimals, how
    // much of `_outputToken` am I going to receive? Put that amount
    // in `price`
    function setRatio(
        address _inputToken,
        address _outputToken,
        uint248 _price
    ) external {
        prices[_inputToken][_outputToken] = _price;
    }

    function mintToken(
        address token,
        address to,
        uint256 amount
    ) external {
        Token(token).mint(to, amount);
    }

    function transferTokenOwnership(address token, address to)
        external
        onlyOwner
    {
        Token(token).transferOwnership(to);
    }
}
