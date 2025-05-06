import { CHAIN_LIST } from "@mcp-marketplace/constanst/src/chain";
import { Decimal } from "decimal.js";
import { z } from "zod";
import { getWallet } from "../lib/wallet";

export const name = "get-balance";
export const description = "Get balance of the address on specific chain";
export const paramSchema = {
  chain_id: z.string().describe("The chain id"),
  address: z.string().describe("The address used to get balance"),
};

const paramZodSchema = z.object(paramSchema);

export const handle = async (param: z.infer<typeof paramZodSchema>) => {
  const { chain_id, address } = param;
  const chain = CHAIN_LIST.find((chain) => `${chain.id}` === `${chain_id}`);

  if (!chain) {
    throw new Error("chain not found");
  }

  const wallet = getWallet(chain);
  const balance = await wallet.getBalance(address);

  return {
    content: [
      {
        type: "text",
        text: new Decimal(balance)
          .div(10 ** chain.nativeCurrency.decimals)
          .toString(),
      },
    ],
  };
};
