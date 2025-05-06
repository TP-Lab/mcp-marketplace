import { z } from "zod";
import {
  EVM_CHAIN_LIST,
  SVM_CHAIN_LIST,
  TVM_CHAIN_LIST,
} from "@mcp-marketplace/constanst";

export const name = "list-chains";
export const description = "List all chains";
export const paramSchema = {};

const paramZodSchema = z.object(paramSchema);

export const handle = async (param: z.infer<typeof paramZodSchema>) => {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify([
          {
            type: "evm",
            chains: EVM_CHAIN_LIST,
          },
          {
            type: "svm",
            chains: SVM_CHAIN_LIST,
          },
          {
            type: "tvm",
            chains: TVM_CHAIN_LIST,
          },
        ]),
      },
    ],
  };
};
