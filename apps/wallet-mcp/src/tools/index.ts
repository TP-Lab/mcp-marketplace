import * as connectWalletTool from "./connect-wallet";
import * as listChainsTool from "./list-chains";
import * as getBalanceTool from "./get-balance";
import * as signMessageTool from "./sign-message";
import * as signTransactionTool from "./sign-transaction";
import * as transferNativeTokenTool from "./transfer-native-token";
export const tools: {
  name: string;
  description: string;
  paramSchema: any;
  handle: (param: any) => Promise<any>;
}[] = [
  connectWalletTool,
  listChainsTool,
  getBalanceTool,
  signMessageTool,
  signTransactionTool,
  transferNativeTokenTool,
];
