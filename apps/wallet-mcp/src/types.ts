export abstract class Wallet {
  abstract connect(): Promise<string[]>;
  abstract getBalance(address: string): Promise<string>;
  abstract signMessage(params: {
    message: string;
    account: string;
  }): Promise<string>;
  abstract sendTransaction(params: {
    transaction_hex: string;
  }): Promise<string>;
  abstract transferNativeToken(params: {
    account: string;
    to: string;
    amount: string;
  }): Promise<string>;
}
