// SPDX-License-Identifier: MIT
pragma solidity 0.8;

import "hardhat/console.sol";
import {IOrderbook} from "./IOrderbook.sol";
import {IERC20} from "./IERC20.sol";

contract Orderbook is IOrderbook{

    Order [] public buyOrders;
    Order [] public sellOrders;

    uint public constant DECIMALS = 10 ** 4;

    uint curBuyOrderId;
    uint curSellOrderId;

    mapping(address=>mapping (address=>uint)) private balanceOf;

    address BASE = 0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8; //deduct in sell order quantity
    address QUOTE = 0xd9145CCE52D386f254917e481eB44e9943F39138; //deduct in buyorder (quan * price)

    constructor(){
        balanceOf[msg.sender][BASE] = 2000 * DECIMALS;
        balanceOf[msg.sender][QUOTE] = 2000 * DECIMALS;
    }

    function deposit(address _contract, uint _amount) public{
        IERC20(_contract).approve(address(this), _amount);
        bool success = IERC20(_contract).transferFrom(msg.sender, address(this), _amount);
        require(success);
        balanceOf[msg.sender][_contract] += _amount;
    }

    function _balanceOf(address _token) public view returns(uint) {
        return  balanceOf[msg.sender][_token];
    }

    //decimal start from here
    //buy orders are arrange in accending order
    //limitprice and quantity will provided with decimal only
    function placeBuyOrder(uint _limitPrice, uint _quantity) public{
        require(_limitPrice > 0 && _quantity > 0, "Invalid params");
        // _limitPrice = _limitPrice * DECIMALS;
        // _quantity = _quantity * DECIMALS;
        uint total = _limitPrice * _quantity / DECIMALS;
        require(balanceOf[msg.sender][QUOTE] >= total, "inssufient balance");
        balanceOf[msg.sender][QUOTE] -= total;
        Order memory newOrder = Order(
            curBuyOrderId++,
            msg.sender,
            OrderType.BUY,
            _limitPrice,
            _quantity,
            false,
            BASE,
            QUOTE
        );
        uint pointer = insertBuyOrder(newOrder);
        matchBuyOrder(pointer);
    }

     //sell orders are arrange in decending order
    function placeSellOrder(uint _limitPrice, uint quantity) public {
         require(_limitPrice > 0 && quantity > 0, "Invalid params");
        require(balanceOf[msg.sender][BASE] >= quantity, "inssufient balance");
        balanceOf[msg.sender][BASE] -= quantity;
        Order memory newOrder = Order(
            curSellOrderId++,
            msg.sender,
            OrderType.SELL,
            _limitPrice,
            quantity,
            false,
            BASE,
            QUOTE
        );
        uint pointer = insertSellOrder(newOrder);
        matchSellOrder(pointer);
    }
    

    function insertBuyOrder(Order memory newOrder) private returns(uint pointer){
        pointer = buyOrders.length;
        buyOrders.push(newOrder);
        while(pointer > 0 && buyOrders[pointer - 1].price > newOrder.price){
            buyOrders[pointer] = buyOrders[pointer - 1];
            pointer--;
        }
        buyOrders[pointer] = newOrder;
    }

    /*
    * Match happens when sell price is less than or equal to the buy price...
    * or buy price should be greater or equal
    */
    function matchBuyOrder(uint index) private {
        Order storage buyOrder = buyOrders[index];
        if(sellOrders.length < 1 || buyOrder.price < sellOrders[sellOrders.length - 1].price) return;
        uint i = sellOrders.length;
        while(i > 0 && sellOrders[i - 1].price <= buyOrder.price){
            Order storage sellOrder = sellOrders[i - 1];
            
            uint256 quantity = (buyOrder.quantity < sellOrder.quantity) ? buyOrder.quantity : sellOrder.quantity;
            buyOrder.quantity -= quantity;
            sellOrder.quantity -= quantity;

            //if sell order price is less than the buy order,, return the remaining price
            //example buyorder for (2 -> 10) and sell order is (3-> 8), so we go a better deal on 8
            // so 8 * 2 = 16 Quote will transfer to seller and remaining 4 Quote out of 20 Quote paid by buyer will be creadited back to buyer
            //with the BASE token he want to buy
            uint diff = buyOrder.price - sellOrder.price;
            balanceOf[buyOrder.trader][QUOTE] += ((diff * quantity) / DECIMALS);

            balanceOf[buyOrder.trader][BASE] += quantity;//only the amount of token that is sold
            balanceOf[sellOrder.trader][QUOTE] += (quantity * sellOrder.price / DECIMALS);

            if(sellOrder.quantity == 0){
                sellOrders.pop();
                i--;
            }

            if(buyOrder.quantity == 0){
                buyOrders.pop();
                break;
            }
        }
    }

    function insertSellOrder(Order memory newOrder) private returns(uint pointer){
        pointer = sellOrders.length;
        sellOrders.push(newOrder);
        while(pointer > 0 && sellOrders[pointer - 1].price < newOrder.price){
            sellOrders[pointer] = sellOrders[pointer - 1];
            pointer--;
        }
        sellOrders[pointer] = newOrder;
    }

    function matchSellOrder(uint index) private {
        Order storage sellOrder = sellOrders[index];
        if(buyOrders.length < 1 || sellOrder.price > buyOrders[buyOrders.length - 1].price) return;
        uint i = buyOrders.length;
        while(i > 0 && buyOrders[i - 1].price >= sellOrder.price){
            Order storage buyOrder = buyOrders[i - 1];
            
            uint256 quantity = (sellOrder.quantity > buyOrder.quantity) ? buyOrder.quantity : sellOrder.quantity;
            sellOrder.quantity -= quantity;
            buyOrder.quantity -= quantity;

            uint diff = buyOrder.price - sellOrder.price;
            balanceOf[buyOrder.trader][QUOTE] += ((diff * quantity) / DECIMALS);

            balanceOf[buyOrder.trader][BASE] += quantity;//only the amount of token that is sold
            balanceOf[sellOrder.trader][QUOTE] += (quantity * sellOrder.price / DECIMALS);

            if(buyOrder.quantity == 0){
                buyOrders.pop();
                i--;
            }

            if(sellOrder.quantity == 0){
                sellOrders.pop();
                break;
            }
        }
    }

    //user will provide the total amount he want to spend
    /*
    * if user is willing to pay 100
    */
    function buyAtMarketPrice(uint _total) public {
        require(sellOrders.length > 0, "no sell orders present");
        while(_total > 0 && sellOrders.length > 0){
            Order storage sellOrder = sellOrders[sellOrders.length - 1];

            uint sellOrderTotal = sellOrder.price * sellOrder.quantity / DECIMALS;

            if(_total >= sellOrderTotal){
                balanceOf[msg.sender][BASE] += sellOrder.quantity;
                balanceOf[msg.sender][QUOTE] -= sellOrderTotal;
                balanceOf[sellOrder.trader][QUOTE] += sellOrderTotal;
                _total = _total - sellOrderTotal;
                sellOrders.pop();
            }else{
                uint quantity = _total * DECIMALS / sellOrder.price; // formula to get the amount of BASE, if QUOTE amount of buyer is less than the sender
                uint amount = quantity * sellOrder.price / DECIMALS;
                balanceOf[msg.sender][BASE] += quantity;
                balanceOf[msg.sender][QUOTE] -= amount;
                balanceOf[sellOrder.trader][QUOTE] += amount;
                sellOrder.quantity -= quantity;
                _total = 0;
            }
        }
    } 

    function sellAtMarketPrice(uint _total) public {
        require(buyOrders.length > 0, "no buyers orders present");
        while(_total > 0 && buyOrders.length > 0){
            Order storage buyOrder = buyOrders[buyOrders.length - 1];
            uint buyOrderTotal = buyOrder.price * buyOrder.quantity / DECIMALS;

            if(_total >= buyOrder.quantity){
                balanceOf[msg.sender][QUOTE] += buyOrderTotal;
                balanceOf[msg.sender][BASE] -= buyOrder.quantity;
                balanceOf[buyOrder.trader][BASE] += buyOrder.quantity;
                _total = _total - buyOrder.quantity;
                buyOrders.pop();
            }else{
                uint amount = _total * buyOrder.price / DECIMALS;
                balanceOf[msg.sender][QUOTE] += amount;
                balanceOf[msg.sender][BASE] -= _total;
                balanceOf[buyOrder.trader][BASE] += _total;
                buyOrder.quantity -= _total;
                _total = 0;
            }
        }
    } 

    function getBuyOrders() public view returns(Order[] memory){
        return buyOrders;
    }

    function getSellOrders() public view returns(Order[] memory){
        return sellOrders;
    }

    //this combine function consume a littl more gas than the normal function
    // function placeOrder(OrderType _orderType, uint _limitPrice, uint _quantity) public {
    //     require(_limitPrice > 0 && _quantity > 0, "Invalid params");

    //     uint total = _limitPrice * _quantity;

    //     if (_orderType == OrderType.BUY) {
    //         require(balanceOf[msg.sender][QUOTE] >= total, "insufficient balance");
    //         balanceOf[msg.sender][QUOTE] -= total;
    //     } else if (_orderType == OrderType.SELL) {
    //         require(balanceOf[msg.sender][BASE] >= _quantity, "insufficient balance");
    //         balanceOf[msg.sender][BASE] -= _quantity;
    //     } else {
    //         revert("Invalid order type");
    //     }

    //     Order memory newOrder = Order(
    //         (_orderType == OrderType.BUY) ? curBuyOrderId++ : curSellOrderId++,
    //         msg.sender,
    //         _orderType,
    //         _limitPrice,
    //         _quantity,
    //         false,
    //         BASE,
    //         QUOTE
    //     );

    //     uint pointer = (_orderType == OrderType.BUY) ? insertBuyOrder(newOrder) : insertSellOrder(newOrder);
    //     (_orderType == OrderType.BUY) ? matchBuyOrder(pointer) : matchSellOrder(pointer);
    // }

}