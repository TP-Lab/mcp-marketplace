import { CHAIN_LIST } from "@mcp-marketplace/constanst/src/chain";
import { z } from "zod";
import { getWallet } from "../lib/wallet";

export const name = "send-native-token";
export const description = "Send a native token, only support SOL, ETH, TRX";
export const paramSchema = {
  chain_id: z.string().describe("The chain id"),
  account: z.string().describe("The account address"),
  to: z.string().describe("The destination address"),
  amount: z.string().describe("The amount of native token to send"),
};

const paramZodSchema = z.object(paramSchema);

export const handle = async (param: z.infer<typeof paramZodSchema>) => {
  const { chain_id, account, to, amount } = param;

  const chain = CHAIN_LIST.find((chain) => `${chain.id}` === `${chain_id}`);

  if (!chain) {
    throw new Error("chain not found");
  }

  const wallet = getWallet(chain);

  const tx = await wallet.transferNativeToken({ account, to, amount });

  return {
    content: [
      {
        type: "text",
        text: `transaction hash send success: ${tx}`,
      },
    ],
  };
};
