// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract NotreToken is ERC20 {
    constructor() ERC20("Maricui Token", "MCT") {
        _mint(msg.sender, 1000 * 10**decimals());
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}