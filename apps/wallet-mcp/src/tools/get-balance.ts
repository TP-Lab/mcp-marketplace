import { CHAIN_LIST } from "@mcp-marketplace/constanst/src/chain";
import { createPublicClient, http, type Chain } from "viem";
import { z } from "zod";
import { Connection, PublicKey } from "@solana/web3.js";
import { TronWeb } from "tronweb";
import { Decimal } from "decimal.js";

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

  let balance = "0";
  if (chain.network === "evm") {
    const publicClient = createPublicClient({
      chain: chain as Chain,
      transport: http(chain.rpc_url),
    });

    const data = await publicClient.getBalance({
      address: address as `0x${string}`,
    });
    balance = data.toString();
  } else if (chain.network === "svm") {
    const connection = new Connection(chain.rpc_url);
    const data = await connection.getBalance(new PublicKey(address));
    balance = data.toString();
  } else if (chain.network === "tvm") {
    const tronWeb = new TronWeb({
      fullHost: chain.rpc_url,
    });
    const data = await tronWeb.trx.getBalance(address);
    balance = data.toString();
  }

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
