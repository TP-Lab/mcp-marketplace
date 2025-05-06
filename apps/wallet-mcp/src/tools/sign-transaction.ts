import { CHAIN_LIST } from "@mcp-marketplace/constanst/src/chain";
import { z } from "zod";
import { getWallet } from "../lib/wallet";

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

  const wallet = getWallet(chain);

  const signedTx = await wallet.sendTransaction({
    transaction_hex: transaction_hex,
  });

  return {
    content: [
      {
        type: "text",
        text: "send success,tx hash:",
      },
      {
        type: "text",
        text: JSON.stringify(signedTx),
      },
    ],
  };
};
