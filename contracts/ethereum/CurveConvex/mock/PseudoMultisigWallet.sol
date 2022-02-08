// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/utils/Address.sol";

contract PseudoMultisigWallet {
    using Address for address;

    function executeCall(address destination, bytes calldata _calldata)
        external
        returns (bytes memory)
    {
        return destination.functionCall(_calldata);
    }
}
