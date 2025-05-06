import { CHAIN_LIST } from "@mcp-marketplace/constanst/src/chain";
import {
  TPMCPWalletSvmAdapter,
  TPMCPWalletTvmAdapter,
  createTpMCPEvmWalletClient,
} from "tp-mcp-wallet";
import type { Chain } from "viem";
import { z } from "zod";

export const name = "sign-message";
export const description = "Sign a message";
export const paramSchema = {
  chain_id: z.string().describe("The chain id"),
  message: z.string().describe("The message to sign"),
  account: z.string().describe("The account address to sign the message"),
};

const paramZodSchema = z.object(paramSchema);

export const handle = async (param: z.infer<typeof paramZodSchema>) => {
  const { chain_id, message, account } = param;

  const chain = CHAIN_LIST.find((chain) => `${chain.id}` === `${chain_id}`);

  if (!chain) {
    throw new Error("chain not found");
  }

  if (chain.network === "evm") {
    const client = createTpMCPEvmWalletClient({
      chain: chain as unknown as Chain,
    });

    const tx = await client.signMessage({
      message: message,
      account: account as `0x${string}`,
    });

    return {
      content: [
        {
          type: "text",
          text: tx,
        },
      ],
    };
  }

  if (chain.network === "svm") {
    const client = new TPMCPWalletSvmAdapter(chain.id as string);
    const signedMsg = await client.signMessage(
      new Uint8Array(Buffer.from(message, "utf-8")),
    );

    return {
      content: [
        {
          type: "text",
          text: Buffer.from(signedMsg).toString("hex"),
        },
      ],
    };
  }

  if (chain.network === "tvm") {
    const tvmClient = new TPMCPWalletTvmAdapter(chain.id as unknown as string);
    const signedMsg = await tvmClient.signMessage(message);

    return {
      content: [
        {
          type: "text",
          text: signedMsg,
        },
      ],
    };
  }
};
