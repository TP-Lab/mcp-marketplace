import type { Chain } from "@mcp-marketplace/constanst/src/types";
import type { Wallet } from "../../types";
import { TPMCPWalletTvmAdapter } from "tp-mcp-wallet";
import { TronWeb } from "tronweb";
import Decimal from "decimal.js";

export class TvmWallet implements Wallet {
  chain: Chain;
  client: TPMCPWalletTvmAdapter;
  constructor(chain: Chain) {
    this.chain = chain;
    this.client = new TPMCPWalletTvmAdapter(chain.id as string);
  }

  async transferNativeToken(params: {
    account: string;
    to: string;
    amount: string;
  }) {
    const { account, to, amount } = params;
    const tron = new TronWeb({
      fullHost: this.chain.rpc_url,
    });
    const transaction = await tron.transactionBuilder.sendTrx(
      to,
      new Decimal(amount).times(10 ** 6).toNumber(),
      account,
    );
    const txData = await this.client.signTransaction(transaction);
    const res = await tron.trx.sendRawTransaction(txData);
    return JSON.stringify(res);
  }

  async connect() {
    const res = await this.client.connect();
    return res;
  }

  async getBalance(address: string) {
    const tronWeb = new TronWeb({
      fullHost: this.chain.rpc_url,
    });
    const data = await tronWeb.trx.getBalance(address);
    return data.toString();
  }

  async signMessage(params: { message: string; account: string }) {
    const signedMsg = await this.client.signMessage(params.message);
    return signedMsg;
  }

  async sendTransaction(params: { transaction_hex: string }) {
    const { transaction_hex } = params;
    const transaction = JSON.parse(
      Buffer.from(transaction_hex, "hex").toString("utf-8"),
    );
    const signedTransaction = await this.client.signTransaction(transaction);
    const tron = new TronWeb({
      fullHost: this.chain.rpc_url,
    });
    const res = await tron.trx.sendRawTransaction(signedTransaction);
    return JSON.stringify(res);
  }
}
