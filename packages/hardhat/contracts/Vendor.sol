pragma solidity 0.8.20; //Do not change the solidity version as it negatively impacts submission grading
// SPDX-License-Identifier: MIT

// import "@openzeppelin/contracts/access/Ownable.sol";
import "./YourToken.sol";

contract Vendor {
    event BuyTokens(address buyer, uint256 amountOfETH, uint256 amountOfTokens);

    YourToken public yourToken;

    constructor(address tokenAddress) {
        yourToken = YourToken(tokenAddress);
    }

    uint256 public constant tokensPerEth = 100;

    // ToDo: create a payable buyTokens() function:
    function buyTokens() public payable {
      require(msg.value > 0, "Send ETH to buy tokens");

      // Calculate tokens to buy
      uint256 tokensToBuy = (msg.value * tokensPerEth * (10 ** 18)) / 1 ether;
      require(yourToken.balanceOf(address(this)) >= tokensToBuy, "Vendor: insufficient token balance (ERC20InsufficientBalance)");

      bool sent = yourToken.transfer(msg.sender, tokensToBuy);
      require(sent, "Token transfer failed");

      emit BuyTokens(msg.sender, msg.value, tokensToBuy);
    }

    // ToDo: create a withdraw() function that lets the owner withdraw ETH

    // ToDo: create a sellTokens(uint256 _amount) function:
}
