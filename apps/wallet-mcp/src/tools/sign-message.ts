import { CHAIN_LIST } from "@mcp-marketplace/constanst/src/chain";
import { z } from "zod";
import { getWallet } from "../lib/wallet";

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

  const wallet = getWallet(chain);
  const signedMsg = await wallet.signMessage({
    message,
    account,
  });

  return {
    content: [
      {
        type: "text",
        text: signedMsg,
      },
    ],
  };
};
