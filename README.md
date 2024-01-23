# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```

run this command to install the dependencies without any hassel

```
yarn add --dev hardhat @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers ethers
```

# Decentralized Exchange (DEX) Smart Contract

## Overview

This smart contract implements a basic decentralized exchange (DEX) where users can place buy and sell orders for trading tokens. The DEX supports limit orders, market orders, and provides a simple order matching mechanism.

## Contract Structure

### Orderbook Contract

- `Orderbook` contract is the main contract that manages buy and sell orders.
- Implements the `IOrderbook` interface.
- Keeps track of buy and sell orders in separate arrays.
- Handles order placement, order matching, and token balances.

### Dependencies

- Uses ERC-20 token interface (`IERC20`) for interacting with ERC-20 compliant tokens.
- Relies on the `IOrderbook` interface for abstraction.

## Token Management

- Tokens supported: `BASE` and `QUOTE`.
- Initial token balances are set during contract deployment.

## Order Placement

- Users can place buy and sell orders with specified limit prices and quantities.
- Buy orders are arranged in ascending order based on limit prices.
- Sell orders are arranged in descending order based on limit prices.

## Order Matching

- Matchmaking occurs when a new order is placed.
- Matches are made based on the limit price and quantity of buy and sell orders.
- Partial fills are supported, and remaining quantities are updated accordingly.

## Market Orders

- Users can execute market orders at the current market prices.
- Market buy orders purchase from the lowest available sell orders.
- Market sell orders sell to the highest available buy orders.

## Functions

- `deposit`: Allows users to deposit tokens into the exchange.
- `placeBuyOrder`: Places a limit buy order on the orderbook.
- `placeSellOrder`: Places a limit sell order on the orderbook.
- `buyAtMarketPrice`: Executes a market buy order at the current market prices.
- `sellAtMarketPrice`: Executes a market sell order at the current market prices.
- `getBuyOrders`: Retrieves the current buy orders.
- `getSellOrders`: Retrieves the current sell orders.

## Example Usage

1. Deploy the contract.
2. Deposit tokens using the `deposit` function.
3. Place limit buy or sell orders using `placeBuyOrder` or `placeSellOrder`.
4. Execute market orders using `buyAtMarketPrice` or `sellAtMarketPrice`.
5. Monitor orderbook status using `getBuyOrders` and `getSellOrders`.

## Token Standards

- This contract is designed to work with ERC-20 compliant tokens.
- Ensure tokens adhere to the ERC-20 standard for proper functionality.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For any inquiries or issues, please contact the project maintainers.
