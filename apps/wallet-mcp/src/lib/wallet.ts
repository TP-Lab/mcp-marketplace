import type { Chain } from "@mcp-marketplace/constanst/src/types";
import { EvmWallet } from "./evm";
import { SvmWallet } from "./svm";
import { TvmWallet } from "./tvm";
import type { Wallet } from "../types";

export function getWallet(chain: Chain): Wallet {
  if (chain.network === "evm") {
    return new EvmWallet(chain);
  }

  if (chain.network === "svm") {
    return new SvmWallet(chain);
  }

  if (chain.network === "tvm") {
    return new TvmWallet(chain);
  }
  throw new Error("Unsupported chain");
}
