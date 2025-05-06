import { createTpMCPEvmWalletClient } from "tp-mcp-wallet";
import { createPublicClient, http, parseEther } from "viem";
import type { Wallet } from "../../types";
import type { Chain } from "@mcp-marketplace/constanst/src/types";
import type { Chain as EvmChain } from "viem";

export class EvmWallet implements Wallet {
  client: ReturnType<typeof createTpMCPEvmWalletClient>;
  chain: Chain;
  constructor(chain: Chain) {
    this.chain = chain;
    this.client = createTpMCPEvmWalletClient({
      chain: chain as unknown as EvmChain,
    });
  }
  async transferNativeToken(params: {
    account: string;
    to: string;
    amount: string;
  }) {
    const { account, to, amount } = params;

    const amountWei = parseEther(amount.toString());

    const tx = await this.client.sendTransaction({
      chain: this.chain as EvmChain,
      account: account as `0x${string}`,
      to: to as `0x${string}`,
      value: amountWei,
    });

    return tx;

  }

  async connect() {
    const addresses = await this.client.requestAddresses();
    return addresses;
  }

  async getBalance(address: string) {
    const publicClient = createPublicClient({
      chain: this.chain as EvmChain,
      transport: http(this.chain.rpc_url),
    });

    const data = await publicClient.getBalance({
      address: address as `0x${string}`,
    });
    return data.toString();
  }

  async signMessage(params: { message: string; account: string }) {
    const hash = await this.client.signMessage({
      message: params.message,
      account: params.account as `0x${string}`,
    });
    return hash;
  }

  async sendTransaction(params: {
    transaction_hex: string;
  }) {
    const { transaction_hex } = params;

    const transaction = JSON.parse(
      Buffer.from(transaction_hex, "hex").toString("utf-8"),
    );

    const tx = await this.client.sendTransaction({
      ...transaction,
      value: parseEther(transaction.value),
    });

    return tx;
  }
}
