import { Connection, VersionedTransaction } from "@solana/web3.js";
import { CHAIN_LIST } from "@mcp-marketplace/constanst/src/chain";
import {
  TPMCPWalletSvmAdapter,
  TPMCPWalletTvmAdapter,
  createTpMCPEvmWalletClient,
} from "tp-mcp-wallet";
import { TronWeb } from "tronweb";
import { parseEther, type Chain } from "viem";
import { z } from "zod";

export const name = "sign-and-send-transaction";
export const description = "Sign a transaction and send it";
export const paramSchema = {
  chain_id: z.string().describe("The chain id"),
  transaction_hex: z.string().describe("The transaction hex"),
};

const paramZodSchema = z.object(paramSchema);

export const handle = async (param: z.infer<typeof paramZodSchema>) => {
  const { chain_id, transaction_hex } = param;

  const chain = CHAIN_LIST.find((chain) => `${chain.id}` === `${chain_id}`);

  if (!chain) {
    throw new Error("chain not found");
  }

  if (chain.network === "evm") {
    const client = createTpMCPEvmWalletClient({
      chain: chain as unknown as Chain,
    });

    const transaction = JSON.parse(
      Buffer.from(transaction_hex, "hex").toString("utf-8"),
    );

    const tx = await client.sendTransaction({
      ...transaction,
      value: parseEther(transaction.value),
    });

    return {
      content: [
        {
          type: "text",
          text: "send success,tx hash:",
        },
        {
          type: "text",
          text: JSON.stringify(tx),
        },
      ],
    };
  }

  if (chain.network === "svm") {
    const client = new TPMCPWalletSvmAdapter(chain.id as string);
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(transaction_hex, "hex"),
    );

    const connection = new Connection(chain.rpc_url);
    const signedTransaction = await client.signTransaction(transaction);

    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      },
    );

    return {
      content: [
        {
          type: "text",
          text: signature,
        },
      ],
    };
  }

  if (chain.network === "tvm") {
    const tvmClient = new TPMCPWalletTvmAdapter(chain.id as unknown as string);
    const transaction = JSON.parse(
      Buffer.from(transaction_hex, "hex").toString("utf-8"),
    );
    const signedTransaction = await tvmClient.signTransaction(transaction);

    const tron = new TronWeb({
      fullHost: chain.rpc_url,
    });

    const res = await tron.trx.sendRawTransaction(signedTransaction);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(res),
        },
      ],
    };
  }
};
