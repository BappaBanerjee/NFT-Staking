// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
//import
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract Staking {
    //custom errors
    error InvalidAllowance();
    error InvalidStakingId();
    error NotAllowed();

    //events
    event staked(address staker, address nftContract, uint tokenId, uint timestamp);
    event unStaked(address staker, address nftContract, uint tokenId, uint timestamp);
    event claimed(address staker, address nftContract, uint tokenId, uint timestamp);

    //constants
    uint constant REWARD_PER_BLOCK = 10; // 10 token
    uint constant UNBOUNDING_PERIOD = 100; // 100 blocks
    IERC20 REWARD_TOKEN;

    //datastructure
    struct Info{
        address staker;
        address nftContract;
        uint blockNumber;
        uint tokenId;
        uint unboundingPeriod;
        bool staked;
    }

    //variables
    mapping(uint=>Info) public stakedInfo;
    mapping(address=>uint[]) public stakedIds;

    constructor(address _rewardToken){
        REWARD_TOKEN = IERC20(_rewardToken);
    }

    /*
        - Users can stake one or more multiple NFTs.
        - For each staked NFT, the user receives X reward tokens per block.
    */
    function stake(uint _stakingId, address _nftContract, uint _tokenId) public {
        //check if the staking Id is already listed
        if(stakedInfo[_stakingId].staker != address(0)) revert InvalidStakingId();

        IERC721 _NFTContract = IERC721(_nftContract);
        if(_NFTContract.getApproved(_tokenId) != address(this) ) revert InvalidAllowance();
        
        stakedInfo[_stakingId] = Info({
            staker : msg.sender,
            nftContract : _nftContract,
            blockNumber : block.number,
            tokenId : _tokenId,
            unboundingPeriod : 0,
            staked : true
        });
        stakedIds[msg.sender].push(_stakingId);
        emit staked(msg.sender,_nftContract, _tokenId, block.timestamp);
    }

    /*
        - Users can unstake NFTs.
        - Users can choose which specific NFTs to unstake.
        - After unstaking, there is an unbonding period after which the user can withdraw the
    */
    function unstake(uint _stakedID) public {
        if(stakedInfo[_stakedID].staker != msg.sender) revert NotAllowed();
        // if(stakedInfo[_stakedID].staker == address(0)) revert InvalidStakingId();
        Info storage _info = stakedInfo[_stakedID];
        _info.unboundingPeriod = block.number + UNBOUNDING_PERIOD;
    }

    function withdraw(uint _stakedId) public {
        if(stakedInfo[_stakedId].staker != msg.sender) revert NotAllowed();
        if(stakedInfo[_stakedId].unboundingPeriod == 0) revert NotAllowed();
        if(stakedInfo[_stakedId].unboundingPeriod < block.timestamp) revert NotAllowed();
        Info storage _info = stakedInfo[_stakedId];
        IERC721(_info.nftContract).safeTransferFrom(address(this), _info.staker, _info.tokenId);
    }

     
    function rewardClaim() public {
        uint[] memory _stakedIds = stakedIds[msg.sender];
        if(_stakedIds.length == 0) revert InvalidStakingId();

        uint amount = 0;
        for(uint i=0 ; i<_stakedIds.length ; i++){
            amount += rewardCalculation(stakedIds[msg.sender][i]);
        }
        REWARD_TOKEN.transfer(msg.sender, amount);
    }

    function rewardCalculation(uint _stakedId) public returns (uint) {
        /*
            if the current block sub stakedBlock equal or less 0 return 0
            if unbounding period is 0 or greater than current block number
                reward = (current block number - staked block number) * reward per block
                staked block number = current block number
            else if it's staked
                reward = current block number - unbounding block number * RBP
                mark staked value as false
            else return 0
        */

        if(block.number - stakedInfo[_stakedId].blockNumber < 0) return 0;
        if(stakedInfo[_stakedId].unboundingPeriod == 0 || stakedInfo[_stakedId].unboundingPeriod > block.number) {
            uint _reward = (block.number - stakedInfo[_stakedId].blockNumber) * REWARD_PER_BLOCK;
            stakedInfo[_stakedId].blockNumber = block.number;
            return _reward;
        } else if(stakedInfo[_stakedId].staked) {
            uint _reward = (block.number - stakedInfo[_stakedId].unboundingPeriod) * REWARD_PER_BLOCK;
            stakedInfo[_stakedId].blockNumber = block.number;
            stakedInfo[_stakedId].staked = false;
            return _reward;
        }else {
            return 0;
        }
    }
}