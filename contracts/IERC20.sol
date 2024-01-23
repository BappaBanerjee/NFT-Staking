// SPDX-License-Identifier: MIT
pragma solidity 0.8; 

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
}
