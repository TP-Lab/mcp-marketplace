import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import { Decimal } from "decimal.js";
import { buildSendSolTransactionInstruction, buildTransaction } from "./lib";
import { CHAIN_LIST } from "@mcp-marketplace/constanst/src/chain";

import { Connection } from "@solana/web3.js";

// Create server instance
const server = new McpServer({
  name: "solana swap",
  version: "1.0.0",
  capabilities: {
    tools: {},
  },
});

server.tool(
  "send-sol",
  "build send sol to the user transaction to be signed",
  {
    amount: z.number().describe("the amount of sol to send"),
    from: z.string().describe("the user wallet solana address"),
    to: z.string().describe("the destination wallet solana address"),
    chain_id: z.string().describe("The chain id"),
  },
  async ({ amount, from, to, chain_id }) => {
    const chain = CHAIN_LIST.find((chain) => `${chain.id}` === `${chain_id}`);
    if (!chain) {
      throw new Error("chain not found");
    }
    const instruction = await buildSendSolTransactionInstruction({
      from: from,
      to: to,
      amount: new Decimal(amount).mul(10 ** 9).toString(),
    });

    const connection = new Connection(chain.rpc_url);

    const blockhash = await connection.getLatestBlockhash();

    const transaction = await buildTransaction({
      instructions: [...instruction],
      addressLookupTableAddresses: [],
      blockhash: blockhash.blockhash,
      feePayer: new PublicKey(from),
    });

    const txData = Buffer.from(transaction.serialize()).toString("hex");

    return {
      content: [
        {
          type: "text",
          text: "use wallet to sign the following data",
        },
        {
          type: "text",
          text: txData,
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Solana Instruction MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
});
