// SPDX-License-Identifier: MIT
pragma solidity 0.8;

interface IOrderbook {
    enum OrderType{
        BUY,
        SELL
    }
    struct Order {
        uint256 orderId;
        address trader;
        OrderType orderType;
        uint256 price;
        uint256 quantity;
        bool isFilled;
        address baseToken;
        address quoteToken;
    }
}