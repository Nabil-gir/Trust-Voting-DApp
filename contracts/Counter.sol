// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

contract Counter {
    uint public x;
    uint public constant MAX_X = 10;

    event Increment(uint by);

    function inc() public {
        require(x < 10, "Counter: maximum atteint");
        x++;

        emit Increment(1);
    }

    function incBy(uint by) public {
       require(x < 10, "Counter: maximum atteint");
        x += by;

        emit Increment(by);
    }
}
