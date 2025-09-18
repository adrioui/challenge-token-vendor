pragma solidity 0.8.20; //Do not change the solidity version as it negatively impacts submission grading
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "./YourToken.sol";

contract Vendor is Ownable {
    event BuyTokens(address buyer, uint256 amountOfETH, uint256 amountOfTokens);
    event SellTokens(address seller, uint256 amountOfETH, uint256 amountOfTokens);

    YourToken public yourToken;

    constructor(address tokenAddress) Ownable(msg.sender) {
        yourToken = YourToken(tokenAddress);
    }

    uint256 public constant tokensPerEth = 100;

    function buyTokens() public payable {
      require(msg.value > 0, "Send ETH to buy tokens");

      // Calculate tokens to buy
      uint256 tokensToBuy = (msg.value * tokensPerEth * (10 ** 18)) / 1 ether;
      require(yourToken.balanceOf(address(this)) >= tokensToBuy, "Vendor: insufficient token balance (ERC20InsufficientBalance)");

      bool sent = yourToken.transfer(msg.sender, tokensToBuy);
      require(sent, "Token transfer failed");

      emit BuyTokens(msg.sender, msg.value, tokensToBuy);
    }

    function withdraw() external onlyOwner {
      uint256 balance = address(this).balance;
      require(balance > 0, "No ETH to withdraw");

      (bool success, ) = owner().call{value: balance}("");
      require(success, "Withdraw failed");
    }

    function sellTokens(uint256 amount) external {
      require(amount > 0, "Amount should be more than zero!");

      uint256 allowance = yourToken.allowance(msg.sender, address(this));
      require(allowance >= amount, "Check the token allowance");

      bool received = yourToken.transferFrom(msg.sender, address(this), amount);
      require(received, "Token transfer failed");

      uint256 ethToTransfer = (amount * 1 ether) / (tokensPerEth * 1e18);
      require(address(this).balance >= ethToTransfer, "Vendor: insufficient ETH balance");

      (bool success, ) = msg.sender.call{value: ethToTransfer}("");
      require(success, "ETH transfer failed");

      emit BuyTokens(msg.sender, ethToTransfer, amount);
    }
}
