import type { Chain } from "@mcp-marketplace/constanst/src/types";
import type { Wallet } from "../../types";
import { TPMCPWalletSvmAdapter } from "tp-mcp-wallet";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import { buildSendSolTransactionInstruction, buildTransaction } from "./lib";
import Decimal from "decimal.js";

export class SvmWallet implements Wallet {
  chain: Chain;
  client: TPMCPWalletSvmAdapter;
  constructor(chain: Chain) {
    this.chain = chain;
    this.client = new TPMCPWalletSvmAdapter(chain.id as string);
  }

  async transferNativeToken(params: {
    account: string;
    to: string;
    amount: string;
  }) {
    const { account, to, amount } = params;
    const instruction = await buildSendSolTransactionInstruction({
      from: account,
      to: to,
      amount: new Decimal(amount).mul(10 ** 9).toString(),
    });
    const connection = new Connection(this.chain.rpc_url);
    const blockhash = await connection.getLatestBlockhash();
    const transaction = await buildTransaction({
      instructions: [...instruction],
      addressLookupTableAddresses: [],
      blockhash: blockhash.blockhash,
      feePayer: new PublicKey(account),
    });
    const signedTransaction = await this.client.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      },
    );
    return signature;
  }

  async getBalance(address: string) {
    const connection = new Connection(this.chain.rpc_url);
    const data = await connection.getBalance(new PublicKey(address));
    return data.toString();
  }

  async signMessage(params: {
    message: string;
    account: string;
  }) {
    const signedMsg = await this.client.signMessage(
      new Uint8Array(Buffer.from(params.message, "utf-8")),
    );
    return Buffer.from(signedMsg).toString("hex");
  }

  async sendTransaction(params: { transaction_hex: string }) {
    const { transaction_hex } = params;
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(transaction_hex, "hex"),
    );
    const connection = new Connection(this.chain.rpc_url);
    const signedTransaction = await this.client.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      },
    );
    return signature;
  }

  async connect() {
    await this.client.connect();
    const addresses = this.client.publicKey;
    if (!addresses) {
      return [];
    }
    return [addresses.toString()];
  }
}
