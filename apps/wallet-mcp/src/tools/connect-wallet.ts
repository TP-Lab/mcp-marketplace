import { CHAIN_LIST } from "@mcp-marketplace/constanst/src/chain";
import { z } from "zod";
import { getWallet } from "../lib/wallet";

export const name = "connect-wallet";
export const description = "Connect to the wallet";
export const paramSchema = {
  chain_id: z
    .string()
    .describe(
      "The chain id form our list-chains response, if you want to connect to the default chain, you can leave it empty",
    ),
};

const connectWalletSchema = z.object(paramSchema);

export const handle = async (param: z.infer<typeof connectWalletSchema>) => {
  const { chain_id } = param;

  try {
    const chain = CHAIN_LIST.find((c) => `${c.id}` === `${chain_id}`);

    if (!chain) {
      return {
        content: [
          {
            type: "text",
            text: "chain not found",
          },
        ],
      };
    }

    const wallet = getWallet(chain);

    const addresses = await wallet.connect();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(addresses),
        },
      ],
    };
  } catch (e) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: e.message,
            stack: e.stack,
          }),
        },
      ],
    };
  }
};
