import "dotenv/config";
import { test } from "vitest";
import { tools } from "../src/tools";

import { CHAIN_LIST } from "@mcp-marketplace/constanst/src/chain";
import { parseEther, stringToHex } from "viem";
import {
  Connection,
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { TronWeb } from "tronweb";

const [
  connectWalletTool,
  listChainsTool,
  getBalanceTool,
  signMessageTool,
  signTransactionTool,
] = tools;

const addressMap: Record<string, string> = {};

for (const chain of [CHAIN_LIST[1], CHAIN_LIST[3], CHAIN_LIST[5]]) {
  test(
    `test connectWalletTool on ${chain.name}`,
    { timeout: 1000 * 60 * 60 },
    async () => {
      const res = await connectWalletTool.handle({ chain_id: chain.id });
      console.log(res);
      const data = JSON.parse(res.content[0].text);
      addressMap[`${chain.id}`] = data?.address || data?.[0];
    },
  );

  test.skip(
    `test get balance on ${chain.name}`,
    { timeout: 1000 * 60 * 60 },
    async () => {
      const res = await getBalanceTool.handle({
        chain_id: chain.id,
        address: addressMap[`${chain.id}`],
      });
      console.log(res);
    },
  );

  test.skip(
    `test sign message on ${chain.name}`,
    { timeout: 1000 * 60 * 60 },
    async () => {
      console.log("account ", addressMap[`${chain.id}`]);
      const res = await signMessageTool.handle({
        chain_id: chain.id,
        account: addressMap[`${chain.id}`],
        message: "hello",
      });
      console.log(res);
    },
  );

  test(
    `test sign transaction on ${chain.name}`,
    { timeout: 1000 * 60 * 60 },
    async () => {
      const account = addressMap[`${chain.id}`];
      let transactionHex = "";

      if (chain.network === "evm") {
        const transactionData = {
          account: account,
          to: account,
          value: "0.001",
          chainId: chain.id,
        };
        transactionHex = Buffer.from(JSON.stringify(transactionData)).toString(
          "hex",
        );
        console.log("transactionHex", transactionHex);
      } else if (chain.network === "svm") {
        const conn = new Connection(chain.rpc_url);
        const blockhash = await conn.getLatestBlockhash();
        const transactionInstructionList: TransactionInstruction[] = [];
        transactionInstructionList.push(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(account),
            toPubkey: new PublicKey(account),
            lamports: BigInt(1000),
          }),
        );

        const transaction = new TransactionMessage({
          payerKey: new PublicKey(account),
          recentBlockhash: blockhash.blockhash,
          instructions: transactionInstructionList,
        }).compileToV0Message([]);

        transactionHex = Buffer.from(
          new VersionedTransaction(transaction).serialize(),
        ).toString("hex");
      } else if (chain.network === "tvm") {
        console.log(chain.rpc_url);
        const tron = new TronWeb({
          fullHost: chain.rpc_url,
        });

        const transaction = await tron.transactionBuilder.sendTrx(
          "TXbGWKFrYvcW6949agfvVQvfjdU7ic4TpF",
          1000000,
          account,
        );

        transactionHex = Buffer.from(JSON.stringify(transaction)).toString(
          "hex",
        );
      }

      const res = await signTransactionTool.handle({
        chain_id: chain.id,
        transaction_hex: transactionHex,
      });

      console.log(res);
    },
  );
}
