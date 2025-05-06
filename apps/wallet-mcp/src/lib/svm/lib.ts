import {
  type AddressLookupTableAccount,
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { Decimal } from "decimal.js";

export function buildSendSolTransactionInstruction(param: {
  from: string;
  to: string;
  amount: string;
}) {
  const transactionInstructionList: TransactionInstruction[] = [];
  transactionInstructionList.push(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(param.from),
      toPubkey: new PublicKey(param.to),
      lamports: BigInt(new Decimal(param.amount).toString()),
    }),
  );
  return transactionInstructionList;
}

export function buildTransaction(param: {
  instructions: TransactionInstruction[];
  addressLookupTableAddresses: AddressLookupTableAccount[];
  blockhash: string;
  feePayer: PublicKey;
}) {
  const transaction = new TransactionMessage({
    payerKey: param.feePayer,
    recentBlockhash: param.blockhash,
    instructions: param.instructions,
  }).compileToV0Message(param.addressLookupTableAddresses);
  return new VersionedTransaction(transaction);
}
