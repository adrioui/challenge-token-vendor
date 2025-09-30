"use client";

import { useState } from "react";
import type { NextPage } from "next";
import toast from "react-hot-toast";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { AddressInput, IntegerInput } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useWatchBalance } from "~~/hooks/scaffold-eth/useWatchBalance";
import { getTokenPrice, multiplyTo1e18 } from "~~/utils/scaffold-eth/priceInWei";

const TokenVendor: NextPage = () => {
  const [toAddress, setToAddress] = useState("");
  const [tokensToSend, setTokensToSend] = useState("");
  const [tokensToBuy, setTokensToBuy] = useState<string | bigint>("");
  const [isApproved, setIsApproved] = useState(false);
  const [tokensToSell, setTokensToSell] = useState<string>("");

  // Transaction loading states
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  const { address } = useAccount();
  const { data: yourTokenSymbol } = useScaffoldReadContract({
    contractName: "YourToken",
    functionName: "symbol",
  });

  const { data: yourTokenBalance } = useScaffoldReadContract({
    contractName: "YourToken",
    functionName: "balanceOf",
    args: [address],
  });

  const { data: vendorContractData } = useDeployedContractInfo({ contractName: "Vendor" });
  const { writeContractAsync: writeVendorAsync } = useScaffoldWriteContract({ contractName: "Vendor" });
  const { writeContractAsync: writeYourTokenAsync } = useScaffoldWriteContract({ contractName: "YourToken" });

  const { data: vendorOwner } = useScaffoldReadContract({
    contractName: "Vendor",
    functionName: "owner",
  });

  const { data: vendorTokenBalance } = useScaffoldReadContract({
    contractName: "YourToken",
    functionName: "balanceOf",
    args: [vendorContractData?.address],
  });

  const { data: vendorEthBalance } = useWatchBalance({ address: vendorContractData?.address });

  const { data: tokensPerEth } = useScaffoldReadContract({
    contractName: "Vendor",
    functionName: "tokensPerEth",
  });

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="flex flex-col items-center bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-24 w-full max-w-lg">
          <div className="text-xl">
            Your token balance:{" "}
            <div className="inline-flex items-center justify-center">
              {parseFloat(formatEther(yourTokenBalance || 0n)).toFixed(4)}
              <span className="font-bold ml-1">{yourTokenSymbol}</span>
            </div>
          </div>
          {/* Vendor Balances */}
          <hr className="w-full border-secondary my-3" />
          <div>
            Vendor token balance:{" "}
            <div className="inline-flex items-center justify-center">
              {Number(formatEther(vendorTokenBalance || 0n)).toFixed(4)}
              <span className="font-bold ml-1">{yourTokenSymbol}</span>
            </div>
          </div>
          <div>
            Vendor eth balance: {Number(formatEther(vendorEthBalance?.value || 0n)).toFixed(4)}
            <span className="font-bold ml-1">ETH</span>
          </div>
        </div>

        {/* Buy Tokens */}
        <div className="flex flex-col items-center space-y-4 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-8 w-full max-w-lg">
          <div className="text-xl">Buy tokens</div>
          <div>{tokensPerEth?.toString() || 0} tokens per ETH</div>

          <div className="w-full flex flex-col space-y-2">
            <IntegerInput
              placeholder="amount of tokens to buy"
              value={tokensToBuy.toString()}
              onChange={value => setTokensToBuy(value)}
              disableMultiplyBy1e18
            />

            {/* Cost Preview */}
            {tokensToBuy && tokensPerEth && Number(tokensToBuy) > 0 && (
              <div className="bg-base-200 rounded-lg p-3">
                <div className="text-sm opacity-80">💰 Cost Preview:</div>
                <div className="text-lg font-bold">{(Number(tokensToBuy) / Number(tokensPerEth)).toFixed(4)} ETH</div>
                <div className="text-xs opacity-60">
                  for {Number(tokensToBuy).toLocaleString()} {yourTokenSymbol} tokens
                </div>
              </div>
            )}
          </div>

          <button
            className="btn btn-secondary mt-2"
            disabled={!tokensToBuy || Number(tokensToBuy) <= 0 || isBuying}
            onClick={async () => {
              if (!tokensToBuy || Number(tokensToBuy) <= 0) {
                toast.error("Please enter a valid token amount");
                return;
              }

              setIsBuying(true);
              try {
                const ethPrice = getTokenPrice(tokensToBuy, tokensPerEth);
                toast.loading("Preparing transaction...", { id: "buy-tokens" });

                await writeVendorAsync({ functionName: "buyTokens", value: ethPrice });

                toast.success("🎉 Tokens purchased successfully!", { id: "buy-tokens" });
                setTokensToBuy(""); // Clear input after success
              } catch (err: any) {
                console.error("Error buying tokens:", err);

                // User-friendly error messages
                let errorMessage = "Failed to buy tokens";
                if (err.message?.includes("insufficient funds")) {
                  errorMessage = "❌ Insufficient ETH balance";
                } else if (err.message?.includes("insufficient token balance")) {
                  errorMessage = "❌ Vendor has insufficient tokens";
                } else if (err.message?.includes("user rejected")) {
                  errorMessage = "💼 Transaction cancelled";
                }

                toast.error(errorMessage, { id: "buy-tokens" });
              } finally {
                setIsBuying(false);
              }
            }}
          >
            {isBuying ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Buying...
              </>
            ) : (
              "Buy Tokens"
            )}
          </button>
        </div>

        {!!yourTokenBalance && (
          <div className="flex flex-col items-center space-y-4 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-8 w-full max-w-lg">
            <div className="text-xl">Transfer tokens</div>
            <div className="w-full flex flex-col space-y-2">
              <AddressInput placeholder="to address" value={toAddress} onChange={value => setToAddress(value)} />
              <IntegerInput
                placeholder="amount of tokens to send"
                value={tokensToSend}
                onChange={value => setTokensToSend(value as string)}
                disableMultiplyBy1e18
              />
            </div>

            <button
              className="btn btn-secondary"
              disabled={!toAddress || !tokensToSend || Number(tokensToSend) <= 0 || isTransferring}
              onClick={async () => {
                if (!toAddress || !tokensToSend || Number(tokensToSend) <= 0) {
                  toast.error("Please enter valid address and token amount");
                  return;
                }

                setIsTransferring(true);
                try {
                  toast.loading("Preparing transfer...", { id: "transfer-tokens" });

                  await writeYourTokenAsync({
                    functionName: "transfer",
                    args: [toAddress, multiplyTo1e18(tokensToSend)],
                  });

                  toast.success("✅ Tokens transferred successfully!", { id: "transfer-tokens" });
                  setToAddress("");
                  setTokensToSend("");
                } catch (err: any) {
                  console.error("Error transferring tokens:", err);

                  let errorMessage = "Failed to transfer tokens";
                  if (err.message?.includes("insufficient balance")) {
                    errorMessage = "❌ Insufficient token balance";
                  } else if (err.message?.includes("invalid address")) {
                    errorMessage = "❌ Invalid recipient address";
                  } else if (err.message?.includes("user rejected")) {
                    errorMessage = "💼 Transaction cancelled";
                  }

                  toast.error(errorMessage, { id: "transfer-tokens" });
                } finally {
                  setIsTransferring(false);
                }
              }}
            >
              {isTransferring ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Sending...
                </>
              ) : (
                "Send Tokens"
              )}
            </button>
          </div>
        )}

        {/* Sell Tokens */}
        {!!yourTokenBalance && (
          <div className="flex flex-col items-center space-y-4 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-8 w-full max-w-lg">
            <div className="text-xl">Sell tokens</div>
            <div>{tokensPerEth?.toString() || 0} tokens per ETH</div>

            <div className="w-full flex flex-col space-y-2">
              <IntegerInput
                placeholder="amount of tokens to sell"
                value={tokensToSell}
                onChange={value => setTokensToSell(value as string)}
                disabled={isApproved}
                disableMultiplyBy1e18
              />
            </div>

            <div className="flex gap-4">
              <button
                className={`btn ${isApproved ? "btn-disabled" : "btn-secondary"}`}
                disabled={!tokensToSell || Number(tokensToSell) <= 0 || isSelling}
                onClick={async () => {
                  if (!tokensToSell || Number(tokensToSell) <= 0) {
                    toast.error("Please enter valid token amount to sell");
                    return;
                  }

                  setIsSelling(true);
                  try {
                    toast.loading("Approving tokens...", { id: "approve-tokens" });

                    await writeYourTokenAsync({
                      functionName: "approve",
                      args: [vendorContractData?.address, multiplyTo1e18(tokensToSell)],
                    });

                    toast.success("✅ Tokens approved for selling!", { id: "approve-tokens" });
                    setIsApproved(true);
                  } catch (err: any) {
                    console.error("Error approving tokens:", err);

                    let errorMessage = "Failed to approve tokens";
                    if (err.message?.includes("insufficient balance")) {
                      errorMessage = "❌ Insufficient token balance";
                    } else if (err.message?.includes("user rejected")) {
                      errorMessage = "💼 Transaction cancelled";
                    }

                    toast.error(errorMessage, { id: "approve-tokens" });
                  } finally {
                    setIsSelling(false);
                  }
                }}
              >
                {isSelling ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Approving...
                  </>
                ) : (
                  "Approve Tokens"
                )}
              </button>

              <button
                className={`btn ${isApproved ? "btn-secondary" : "btn-disabled"}`}
                disabled={!isApproved || isSelling}
                onClick={async () => {
                  setIsSelling(true);
                  try {
                    toast.loading("Selling tokens...", { id: "sell-tokens" });

                    await writeVendorAsync({ functionName: "sellTokens", args: [multiplyTo1e18(tokensToSell)] });

                    toast.success("💰 Tokens sold successfully!", { id: "sell-tokens" });
                    setIsApproved(false);
                    setTokensToSell("");
                  } catch (err: any) {
                    console.error("Error selling tokens:", err);

                    let errorMessage = "Failed to sell tokens";
                    if (err.message?.includes("insufficient allowance")) {
                      errorMessage = "❌ Insufficient allowance - please approve first";
                    } else if (err.message?.includes("insufficient balance")) {
                      errorMessage = "❌ Insufficient token balance";
                    } else if (err.message?.includes("insufficient ETH balance")) {
                      errorMessage = "❌ Vendor has insufficient ETH to pay";
                    } else if (err.message?.includes("user rejected")) {
                      errorMessage = "💼 Transaction cancelled";
                    }

                    toast.error(errorMessage, { id: "sell-tokens" });
                  } finally {
                    setIsSelling(false);
                  }
                }}
              >
                {isSelling ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Selling...
                  </>
                ) : (
                  "Sell Tokens"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Owner Withdraw Section */}
        {vendorOwner === address && (
          <div className="flex flex-col items-center space-y-4 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-8 w-full max-w-lg">
            <div className="text-xl">👑 Owner Withdraw</div>
            <div className="text-sm text-center opacity-80">Withdraw all ETH from the vendor contract</div>

            <div className="w-full bg-base-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Available to withdraw:</span>
                <span className="font-bold">{Number(formatEther(vendorEthBalance?.value || 0n)).toFixed(4)} ETH</span>
              </div>
            </div>

            <button
              className="btn btn-primary w-full"
              disabled={!vendorEthBalance || vendorEthBalance.value === 0n || isWithdrawing}
              onClick={async () => {
                if (!vendorEthBalance || vendorEthBalance.value === 0n) {
                  toast.error("No ETH available to withdraw");
                  return;
                }

                setIsWithdrawing(true);
                try {
                  toast.loading("Withdrawing ETH...", { id: "withdraw-eth" });

                  await writeVendorAsync({ functionName: "withdraw" });

                  const withdrawnAmount = Number(formatEther(vendorEthBalance.value)).toFixed(4);
                  toast.success(`💰 Successfully withdrew ${withdrawnAmount} ETH!`, { id: "withdraw-eth" });
                } catch (err: any) {
                  console.error("Error withdrawing ETH:", err);

                  let errorMessage = "Failed to withdraw ETH";
                  if (err.message?.includes("Only owner")) {
                    errorMessage = "❌ Only contract owner can withdraw";
                  } else if (err.message?.includes("No ETH to withdraw")) {
                    errorMessage = "❌ No ETH available in contract";
                  } else if (err.message?.includes("user rejected")) {
                    errorMessage = "💼 Transaction cancelled";
                  }

                  toast.error(errorMessage, { id: "withdraw-eth" });
                } finally {
                  setIsWithdrawing(false);
                }
              }}
            >
              {isWithdrawing ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Withdrawing...
                </>
              ) : (
                <>
                  {vendorEthBalance?.value === 0n
                    ? "No ETH to Withdraw"
                    : `Withdraw ${Number(formatEther(vendorEthBalance?.value || 0n)).toFixed(4)} ETH`}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default TokenVendor;
