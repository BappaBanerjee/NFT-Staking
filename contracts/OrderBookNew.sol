// SPDX-License-Identifier: MIT
pragma solidity 0.8;

import "hardhat/console.sol";
import {IOrderbook} from "./IOrderbook.sol";
import {IERC20} from "./IERC20.sol";


contract OrderBookNew is IOrderbook {

    error InvalidPairContract();

    mapping(address=>mapping(address=>Order[])) public buyOrders;
    mapping(address=>mapping(address=>Order[])) public sellOrders;

    uint curBuyOrderId;
    uint curSellOrderId;

    modifier isPaired(address _base, address _quote){
        if(!pairOf[_base][_quote]) revert InvalidPairContract();
        _;
    }

    mapping(address=>mapping (address=>uint)) private balanceOf;
    mapping(address=>mapping (address=>bool)) private pairOf;

    function mapContracts(address _base, address _quote) public {
        require(_base != address(0) && _quote != address(0), "invalid address");
        pairOf[_base][_quote] = true;
    }

    function deposit(address _contract, uint _amount) public{
        bool success = IERC20(_contract).transferFrom(msg.sender, address(this), _amount);
        require(success);
        balanceOf[msg.sender][_contract] += _amount;
    }

    function withdraw(address _contract , uint _amount) public  {
        require(balanceOf[msg.sender][_contract] >= _amount, "insufficient balance");
        balanceOf[msg.sender][_contract] -= _amount;
        bool success = IERC20(_contract).transferFrom(address(this),msg.sender, _amount);
        require(success);
    }

    function _balanceOf(address _token) public view returns(uint) {
        return  balanceOf[msg.sender][_token];
    }

    //check for contract pair in the functions...

    function getBuyOrders(address _base, address _quote) public view returns(Order[] memory){
        return buyOrders[_base][_quote];
    }

    function getSellOrders(address _base, address _quote) public view returns(Order[] memory){
        return sellOrders[_base][_quote];
    }

    function placeBuyOrder(uint _limitPrice, uint _quantity, address _base, address _quote) public isPaired(_base, _quote){
        require(_limitPrice > 0 && _quantity > 0, "Invalid params");
        uint baseDecimal = 10 ** IERC20(_base).decimals();
        uint total = _limitPrice * _quantity / baseDecimal;
        require(balanceOf[msg.sender][_quote] >= total, "inssufient balance");
        balanceOf[msg.sender][_quote] -= total;
        Order memory newOrder = Order(
            curBuyOrderId++,
            msg.sender,
            OrderType.BUY,
            _limitPrice,
            _quantity,
            false,
            _base,
            _quote
        );
        uint pointer = insertBuyOrder(newOrder, _base, _quote);
        matchBuyOrder(pointer, baseDecimal, _base, _quote);
    }

     //sell orders are arrange in decending order
    function placeSellOrder(uint _limitPrice, uint quantity, address _base, address _quote) public isPaired(_base, _quote) {
        require(_limitPrice > 0 && quantity > 0, "Invalid params");
        require(balanceOf[msg.sender][_base] >= quantity, "inssufient balance");
        uint baseDecimal = 10 ** IERC20(_base).decimals();
        balanceOf[msg.sender][_base] -= quantity;
        Order memory newOrder = Order(
            curSellOrderId++,
            msg.sender,
            OrderType.SELL,
            _limitPrice,
            quantity,
            false,
            _base,
            _quote
        );
        uint pointer = insertSellOrder(newOrder, _base, _quote);
        matchSellOrder(pointer, baseDecimal,  _base, _quote);
    }
    

    function insertBuyOrder(Order memory newOrder, address _base, address _quote) private returns(uint pointer){
        // pointer = buyOrders.length;
        Order[] storage buyorder = buyOrders[_base][_quote];
        pointer = buyorder.length;
        buyorder.push(newOrder);
        while(pointer > 0 && buyorder[pointer - 1].price > newOrder.price){
            buyorder[pointer] = buyorder[pointer - 1];
            pointer--;
        }
        buyorder[pointer] = newOrder;
    }

    function insertSellOrder(Order memory newOrder, address _base, address _quote) private returns(uint pointer){
        Order[] storage sellorder = buyOrders[_base][_quote];
        pointer = sellorder.length;
        sellorder.push(newOrder);
        while(pointer > 0 && sellorder[pointer - 1].price < newOrder.price){
            sellorder[pointer] = sellorder[pointer - 1];
            pointer--;
        }
        sellorder[pointer] = newOrder;
    }


    function matchBuyOrder(uint index, uint baseDecimal, address _base, address _quote) private {
        Order storage buyOrder = buyOrders[_base][_quote][index];
        Order[] storage sell_Orders = sellOrders[_base][_quote];
        if(sell_Orders.length < 1 || buyOrder.price < sell_Orders[sell_Orders.length - 1].price) return;
        uint i = sell_Orders.length;
        while(i > 0 && sell_Orders[i - 1].price <= buyOrder.price){
            Order storage sellOrder = sell_Orders[i - 1];
            
            uint256 quantity = (buyOrder.quantity < sellOrder.quantity) ? buyOrder.quantity : sellOrder.quantity;
            buyOrder.quantity -= quantity;
            sellOrder.quantity -= quantity;

            uint diff = buyOrder.price - sellOrder.price;
            //return the left amount of the buyer, if the buyer is buying at 10 but seller is selling at 8,
            //remaining 2 to credit back to buyer...
            balanceOf[buyOrder.trader][buyOrder.quoteToken] += (diff * quantity) / baseDecimal;

            balanceOf[buyOrder.trader][buyOrder.baseToken] += quantity;//only the amount of token that is sold
            balanceOf[sellOrder.trader][sellOrder.quoteToken] += (quantity * sellOrder.price) / baseDecimal;

            if(sellOrder.quantity == 0){
                sell_Orders.pop();
                i--;
            }

            if(buyOrder.quantity == 0){
                buyOrders[_base][_quote].pop();
                break;
            }
        }
    }

    

    function matchSellOrder(uint index, uint baseDecimal, address _base, address _quote) private {
        Order storage sellOrder = sellOrders[_base][_quote][index];
        Order[] storage buy_orders = buyOrders[_base][_quote];
        if(buy_orders.length < 1 || sellOrder.price > buy_orders[buy_orders.length - 1].price) return;
        uint i = buy_orders.length;
        while(i > 0 && buy_orders[i - 1].price >= sellOrder.price){
            Order storage buyOrder = buy_orders[i - 1];
            
            uint256 quantity = (sellOrder.quantity > buyOrder.quantity) ? buyOrder.quantity : sellOrder.quantity;
            sellOrder.quantity -= quantity;
            buyOrder.quantity -= quantity;

            uint diff = buyOrder.price - sellOrder.price;
            balanceOf[buyOrder.trader][buyOrder.quoteToken] += (diff * quantity) / baseDecimal;

            balanceOf[buyOrder.trader][buyOrder.baseToken] += quantity;//only the amount of token that is sold
            balanceOf[sellOrder.trader][sellOrder.quoteToken] += (quantity * sellOrder.price) / baseDecimal;

            if(buyOrder.quantity == 0){
                buy_orders.pop();
                i--;
            }

            if(sellOrder.quantity == 0){
                sellOrders[_base][_quote].pop();
                break;
            }
        }
    }


    function buyAtMarketPrice(uint _total, address _base, address _quote) public isPaired(_base, _quote) {
        Order[] storage sell_orders = sellOrders[_base][_quote];
        require(sell_orders.length > 0, "no sell orders present");
        uint baseDecimal = 10 ** IERC20(_base).decimals();
        while(_total > 0 && sell_orders.length > 0){
            Order storage sellOrder = sell_orders[sell_orders.length - 1];

            uint sellOrderTotal = sellOrder.price * sellOrder.quantity / baseDecimal;

            if(_total >= sellOrderTotal){
                balanceOf[msg.sender][sellOrder.baseToken] += sellOrder.quantity;
                balanceOf[msg.sender][sellOrder.quoteToken] -= sellOrderTotal;
                balanceOf[sellOrder.trader][sellOrder.quoteToken] += sellOrderTotal;
                _total = _total - sellOrderTotal;
                sell_orders.pop();
            }else{
                uint quantity = _total * baseDecimal / sellOrder.price; // formula to get the amount of BASE, if QUOTE amount of buyer is less than the sender
                uint amount = quantity * sellOrder.price / baseDecimal;
                balanceOf[msg.sender][sellOrder.baseToken] += quantity;
                balanceOf[msg.sender][sellOrder.quoteToken] -= amount;
                balanceOf[sellOrder.trader][sellOrder.quoteToken] += amount;
                sellOrder.quantity -= quantity;
                _total = 0;
            }
        }
    } 

    function sellAtMarketPrice(uint _total, address _base, address _quote) public isPaired(_base, _quote) {
        Order[] storage buy_orders = buyOrders[_base][_quote];
        require(buy_orders.length > 0, "no buyers orders present");
        uint baseDecimal = 10 ** IERC20(_base).decimals();
        while(_total > 0 && buy_orders.length > 0){
            Order storage buyOrder = buy_orders[buy_orders.length - 1];
            uint buyOrderTotal = buyOrder.price * buyOrder.quantity / baseDecimal;

            if(_total >= buyOrder.quantity){
                balanceOf[msg.sender][buyOrder.quoteToken] += buyOrderTotal;
                balanceOf[msg.sender][buyOrder.baseToken] -= buyOrder.quantity;
                balanceOf[buyOrder.trader][buyOrder.baseToken] += buyOrder.quantity;
                _total = _total - buyOrder.quantity;
                buy_orders.pop();
            }else{
                uint amount = _total * buyOrder.price / baseDecimal;
                balanceOf[msg.sender][buyOrder.quoteToken] += amount;
                balanceOf[msg.sender][buyOrder.baseToken] -= _total;
                balanceOf[buyOrder.trader][buyOrder.baseToken] += _total;
                buyOrder.quantity -= _total;
                _total = 0;
            }
        }
    } 
}