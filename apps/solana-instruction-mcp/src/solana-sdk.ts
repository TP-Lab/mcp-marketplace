import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    TokenError,
    createAssociatedTokenAccountInstruction,
    createCloseAccountInstruction,
    createInitializeMint2Instruction,
    createMint,
    createTransferInstruction,
    getAccount,
    getAssociatedTokenAddress,
    getAssociatedTokenAddressSync,
    getMinimumBalanceForRentExemptMint,
    getMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
  } from "@solana/spl-token";
  import {
    AddressLookupTableAccount,
    ComputeBudgetProgram,
    Connection,
    type Finality,
    Keypair,
    PublicKey,
    type SignaturesForAddressOptions,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
  } from "@solana/web3.js";
  import tweetnacl from "tweetnacl";
  
  import bs58 from "bs58";
  export { isAddress } from "@solana/addresses";
  
  import {
    createV1,
    findMetadataPda,
    MPL_TOKEN_METADATA_PROGRAM_ID,
    mplTokenMetadata,
    TokenStandard,
  } from "@metaplex-foundation/mpl-token-metadata";
  import { Decimal } from "decimal.js";
  
  import data from "./solana.tokenlist.json" assert { type: "json" };
  import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
  import {
    createSignerFromKeypair,
    percentAmount,
    publicKey,
    signerIdentity,
  } from "@metaplex-foundation/umi";
  import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
  import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
  
  export const WARP_SOL_ADDRESS = "So11111111111111111111111111111111111111112";
  const COMPUTE_UNIT_LIMIT_MARGIN = 1.05;
  
  type VersionedTransactionResponse = NonNullable<
    Awaited<ReturnType<typeof SolanaSDK.prototype.getTransactionDetail>>
  >;
  
  export class SolanaSDK {
    connection: Connection;
  
    constructor(params: {
      rpcUrl: string;
    }) {
      this.connection = new Connection(params.rpcUrl, {
        commitment: "confirmed",
        disableRetryOnRateLimit: false,
      });
    }
  
    getKeypair(privateKey: string) {
      return Keypair.fromSecretKey(new Uint8Array(bs58.decode(privateKey)));
    }
  
    async generateKeypair() {
      const keypair = Keypair.generate();
      const secretKey = bs58.encode(keypair.secretKey);
      return {
        address: keypair.publicKey.toBase58(),
        secretKey,
        keypair,
      };
    }
  
    async getAddressLookupTableAccounts(
      addresses: string[],
    ): Promise<AddressLookupTableAccount[]> {
      const addressLookupTableAccountInfos =
        await this.connection.getMultipleAccountsInfo(
          addresses.map((address) => new PublicKey(address)),
        );
  
      return addressLookupTableAccountInfos.reduce(
        (accounts, accountInfo, index) => {
          const addressLookupTableAddress = addresses[index];
          if (accountInfo && addressLookupTableAddress) {
            const addressLookupTableAccount = new AddressLookupTableAccount({
              key: new PublicKey(addressLookupTableAddress),
              state: AddressLookupTableAccount.deserialize(accountInfo.data),
            });
            accounts.push(addressLookupTableAccount);
          }
  
          return accounts;
        },
        new Array<AddressLookupTableAccount>(),
      );
    }
  
    async estimateTransactionFee(param: {
      transaction: VersionedTransaction;
      priorityLevel?: "low" | "high" | "normal";
    }) {
      const { transaction, priorityLevel = "normal" } = param;
  
      const unitPriceConfig = {
        low: 1_000_000,
        normal: 2_000_000,
        high: 2_500_000,
      };
  
      const unitPrice = unitPriceConfig[priorityLevel];
  
      const [estimate, computeUnits] = await Promise.all([
        unitPrice,
        this.connection.simulateTransaction(param.transaction, {
          replaceRecentBlockhash: true,
          sigVerify: false,
        }),
      ]);
  
      const computeUnitPrice = estimate || 0;
      const unitsConsumed = computeUnits.value.unitsConsumed ?? null;
  
      if (computeUnits.value.err) {
        console.log(computeUnits.value.logs);
      }
  
      return {
        computeUnitPrice,
        unitsConsumed,
        error: computeUnits.value.err,
      };
    }
  
    async setBudgetInstruction(param: {
      instructions: TransactionInstruction[];
      addressLookupTableAddresses: AddressLookupTableAccount[];
      blockhash: string;
      feePayer: Keypair;
      priorityLevel?: "low" | "high" | "normal";
    }) {
      const {
        instructions,
        addressLookupTableAddresses,
        blockhash,
        feePayer,
        priorityLevel = "normal",
      } = param;
  
      const computeUnitTransactionInstructionForSimulate =
        this.buildComputeUnitTransactionInstruction({
          computeUnitPrice: 2_500_000,
          unitsConsumed: 1000000,
        });
  
      const simulateTransaction = this.buildTransaction({
        instructions: [
          ...computeUnitTransactionInstructionForSimulate,
          ...instructions,
        ],
        addressLookupTableAddresses,
        blockhash,
        feePayer: feePayer.publicKey,
      });
  
      const { computeUnitPrice, unitsConsumed, error } =
        await this.estimateTransactionFee({
          transaction: simulateTransaction,
          priorityLevel,
        });
  
      const actualComputeUnitTransactionInstruction =
        this.buildComputeUnitTransactionInstruction({
          computeUnitPrice,
          unitsConsumed,
        });
  
      return {
        instructions: [
          ...actualComputeUnitTransactionInstruction,
          ...instructions,
        ],
        computeUnitPrice,
        unitsConsumed,
        error,
      };
    }
  
    async isATAExist(param: { address: string; tokenAddress: string }) {
      const tokenAccount = getAssociatedTokenAddressSync(
        new PublicKey(param.tokenAddress),
        new PublicKey(param.address),
      );
      return await getAccount(this.connection, tokenAccount).catch(() => false);
    }
  
    buildCloseTokenAccountInstruction(param: {
      account: PublicKey;
      tokenAddress: PublicKey;
      destination?: PublicKey;
    }) {
      const ataAccount = getAssociatedTokenAddressSync(
        new PublicKey(param.tokenAddress),
        new PublicKey(param.account.toBase58()),
      );
      return [
        createCloseAccountInstruction(
          ataAccount,
          param?.destination ? param.destination : param.account,
          param.account,
        ),
      ];
    }
  
    buildNemoInstruction(param: { memo: string }) {
      return [
        new TransactionInstruction({
          keys: [],
          data: Buffer.from(param.memo, "utf-8"),
          programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
        }),
      ];
    }
  
    buildCreateATAInstruction(param: {
      address: string;
      tokenAddress: string;
      feePayer: PublicKey;
    }) {
      const transactionInstructionList: TransactionInstruction[] = [];
      const tokenAccount = getAssociatedTokenAddressSync(
        new PublicKey(param.tokenAddress),
        new PublicKey(param.address),
      );
  
      transactionInstructionList.push(
        createAssociatedTokenAccountInstruction(
          param.feePayer,
          tokenAccount,
          new PublicKey(param.address),
          new PublicKey(param.tokenAddress),
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
  
      return transactionInstructionList;
    }
  
    buildSendSolTransactionInstruction(param: {
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
  
    buildTokenTransferTransactionInstruction(param: {
      from: string;
      to: string;
      amount: string;
      tokenAddress: string;
      feePayer: PublicKey;
    }) {
      const transactionInstructionList: TransactionInstruction[] = [];
      const fromTokenAccount = getAssociatedTokenAddressSync(
        new PublicKey(param.tokenAddress),
        new PublicKey(param.from),
      );
  
      const toTokenAccount = getAssociatedTokenAddressSync(
        new PublicKey(param.tokenAddress),
        new PublicKey(param.to),
      );
  
      transactionInstructionList.push(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          new PublicKey(param.from),
          BigInt(new Decimal(param.amount).toString()),
        ),
      );
  
      return transactionInstructionList;
    }
  
    buildComputeUnitTransactionInstruction(param: {
      computeUnitPrice: number;
      unitsConsumed: number | null;
    }) {
      const { computeUnitPrice, unitsConsumed } = param;
  
      const unitsConsumedInstructions = unitsConsumed
        ? [
            ComputeBudgetProgram.setComputeUnitLimit({
              units: unitsConsumed * COMPUTE_UNIT_LIMIT_MARGIN,
            }),
          ]
        : [];
      const computeBudgetInstructions =
        computeUnitPrice > 0
          ? [
              ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: computeUnitPrice,
              }),
            ]
          : [];
      return [...unitsConsumedInstructions, ...computeBudgetInstructions];
    }
  
    async buildCreateMintTransactionInstruction(param: {
      from: PublicKey;
      name: string;
      symbol: string;
      decimals: number;
    }) {
      const lamports = await getMinimumBalanceForRentExemptMint(this.connection);
  
      return [
        SystemProgram.createAccount({
          fromPubkey: param.from,
          newAccountPubkey: param.from,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMint2Instruction(
          param.from,
          param.decimals,
          param.from,
          null,
          TOKEN_PROGRAM_ID,
        ),
      ];
    }
  
    buildTransaction(param: {
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
  
    async buildSendTokenTransaction(param: {
      from: Keypair;
      to: string;
      amount: string;
      tokenAddress: string;
      blockhash: string;
      memo?: string;
    }) {
      const computeUnitTransactionInstructions: TransactionInstruction[] = [];
      const createTokenAccountInstructions: TransactionInstruction[] = [];
      const transferTransactionInstructions: TransactionInstruction[] = [];
      const memoInstructions: TransactionInstruction[] = [];
  
      // createTokenAccountInstructions
      const isToTokenAccountExist = await this.isATAExist({
        address: param.to,
        tokenAddress: param.tokenAddress,
      });
      if (!isToTokenAccountExist) {
        createTokenAccountInstructions.push(
          ...this.buildCreateATAInstruction({
            address: param.to,
            tokenAddress: param.tokenAddress,
            feePayer: param.from.publicKey,
          }),
        );
      }
  
      transferTransactionInstructions.push(
        ...this.buildTokenTransferTransactionInstruction({
          from: param.from.publicKey.toBase58(),
          to: param.to,
          amount: param.amount,
          tokenAddress: param.tokenAddress,
          feePayer: param.from.publicKey,
        }),
      );
  
      //memoInstructions
      if (param.memo) {
        memoInstructions.push(...this.buildNemoInstruction({ memo: param.memo }));
      }
  
      const computeUnitTransactionInstructionForSimulate =
        this.buildComputeUnitTransactionInstruction({
          computeUnitPrice: 2_500_000,
          unitsConsumed: 100000,
        });
  
      const simulateTransaction = [
        ...computeUnitTransactionInstructionForSimulate,
        ...createTokenAccountInstructions,
        ...transferTransactionInstructions,
        ...memoInstructions,
      ];
  
      const { computeUnitPrice, unitsConsumed } =
        await this.estimateTransactionFee({
          transaction: this.buildTransaction({
            instructions: simulateTransaction,
            addressLookupTableAddresses: [],
            blockhash: param.blockhash,
            feePayer: param.from.publicKey,
          }),
        });
  
      computeUnitTransactionInstructions.push(
        ...this.buildComputeUnitTransactionInstruction({
          computeUnitPrice,
          unitsConsumed,
        }),
      );
      const finalFee = new Decimal(computeUnitPrice)
        .mul(unitsConsumed || 0)
        .div(10 ** 6)
        .toString();
  
      const finalInstructions = [
        ...computeUnitTransactionInstructions,
        ...createTokenAccountInstructions,
        ...transferTransactionInstructions,
        ...memoInstructions,
      ];
  
      const finalVersionedTransaction = this.buildTransaction({
        instructions: finalInstructions,
        addressLookupTableAddresses: [],
        blockhash: param.blockhash,
        feePayer: param.from.publicKey,
      });
  
      return {
        finalVersionedTransaction,
        fee: finalFee,
      };
    }
  
    async getTokenAccount(param: { tokenAddress: string; owner: string }) {
      try {
        const tokenAccount = await getAssociatedTokenAddress(
          new PublicKey(param.tokenAddress),
          new PublicKey(param.owner),
        );
  
        const account = await getAccount(this.connection, tokenAccount);
  
        return account;
      } catch (e) {
        if (e instanceof TokenError && e.name === "TokenAccountNotFoundError") {
          return null;
        }
        throw e;
      }
    }
  
    async calcTransactionFee(param: {
      to: string;
      amount: string;
      tokenAddress: string;
    }) {
      const fromTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(param.tokenAddress),
        new PublicKey(param.to),
      );
  
      const transaction = new Transaction().add(
        createTransferInstruction(
          fromTokenAccount,
          fromTokenAccount,
          new PublicKey(param.to),
          BigInt(new Decimal(param.amount).toString()),
        ),
      );
  
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(param.to);
  
      const message = transaction.compileMessage();
  
      const fees = await this.connection.getFeeForMessage(message);
      return fees.value;
    }
  
    async calculateAccountRent() {
      // 获取当前的租金配置
      const rentConfig =
        await this.connection.getMinimumBalanceForRentExemption(165);
      return rentConfig;
    }
  
    async getTokenInfo(address: string) {
      try {
        // Check if token exists in the local token list before querying on-chain metadata
        const tokenInfo = (data as any)?.tokens?.find(
          (d: any) => d.address === address,
        );
        if (tokenInfo) {
          return {
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals,
            logoUri: tokenInfo.logoURI,
          };
        }
      } catch (e) {
        console.error(e);
      }
  
      try {
        const mintPubkey = new PublicKey(address);
        const accountInfo = await getMint(this.connection, mintPubkey);
  
        const [metadataAddress] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID).toBuffer(),
            mintPubkey.toBuffer(),
          ],
          new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID),
        );
  
        const accountMeta = await this.connection.getAccountInfo(metadataAddress);
  
        if (!accountMeta?.data) {
          return null;
        }
  
        // Parse metadata manually since we don't have access to the serializer
        const data = accountMeta.data;
  
        // Skip the first byte which is the version
        let offset = 1;
  
        // Skip update authority (32 bytes)
        offset += 32;
  
        // Skip mint (32 bytes)
        offset += 32;
  
        // Read name length (4 bytes) and name
        const nameLength = data.readUInt32LE(offset);
        offset += 4;
        if (offset + nameLength > data.length) return null;
        const name = data
          .slice(offset, offset + nameLength)
          .toString("utf8")
          .replace(/\0/g, "");
        offset += nameLength;
  
        // Read symbol length (4 bytes) and symbol
        const symbolLength = data.readUInt32LE(offset);
        offset += 4;
        if (offset + symbolLength > data.length) return null;
        const symbol = data
          .slice(offset, offset + symbolLength)
          .toString("utf8")
          .replace(/\0/g, "");
        offset += symbolLength;
  
        // Read URI length (4 bytes) and URI
        const uriLength = data.readUInt32LE(offset);
        offset += 4;
        if (offset + uriLength > data.length) return null;
        const uri = data
          .slice(offset, offset + uriLength)
          .toString("utf8")
          .replace(/\0/g, "");
  
        let logoUri = "";
        try {
          const res = await fetch(uri, {
            redirect: "follow",
          });
          const metadata = await res.json();
          logoUri = metadata?.image;
        } catch (e) {
          console.error(e);
        }
  
        return {
          name,
          symbol,
          decimals: accountInfo.decimals,
          logoUri,
        };
      } catch (error) {
        console.error("Error fetching token info:", error);
        return null;
      }
    }
  
    async calculateFee(param: {
      to: string;
      amount: string;
      tokenAddress: string;
    }) {
      let fee = 0;
  
      const tokenAccount = await this.getTokenAccount({
        tokenAddress: param.tokenAddress,
        owner: param.to,
      });
  
      if (!tokenAccount) {
        fee = await this.calculateAccountRent();
      }
  
      const transactionFee = await this.calcTransactionFee(param);
      if (!transactionFee) {
        throw new Error("TRANSACTION_FEE_NOT_FOUND");
      }
  
      return new Decimal(fee + transactionFee).toString();
    }
  
    async getAddressTokenList(address: string) {
      const tokenLargestAccounts = await this.connection.getTokenAccountsByOwner(
        new PublicKey(address),
        {
          programId: TOKEN_PROGRAM_ID,
        },
      );
      const result: Array<{ tokenAccountAddress: string }> = [];
      for (const item of tokenLargestAccounts.value) {
        result.push({
          tokenAccountAddress: item.pubkey.toBase58(),
        });
      }
      return result;
    }
  
    async getTokenAccountBalance(param: { tokenAccountAddress: string }) {
      const tokenAccount = await getAccount(
        this.connection,
        new PublicKey(param.tokenAccountAddress),
      );
      return tokenAccount;
    }
  
    async getSolBalance(address: string) {
      const balance = await this.connection.getBalance(new PublicKey(address));
      return balance;
    }
  
    async getTransactionListByAddress(
      address: string,
      options?: SignaturesForAddressOptions,
      commitment?: Finality,
    ) {
      const transaction = await this.connection.getSignaturesForAddress(
        new PublicKey(address),
        options,
        commitment,
      );
      return transaction;
    }
  
    async getTransactionDetail(signature: string) {
      const transaction = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
  
      return transaction;
    }
  
    getBalanceChange(address: string, detail: VersionedTransactionResponse) {
      const accountList = detail.transaction.message.staticAccountKeys.map(
        (item) => item.toBase58(),
      );
  
      const accountIndex = accountList.findIndex((item) => item === address);
  
      const balanceChange = new Decimal(
        detail.meta?.postBalances?.[accountIndex] || 0,
      )
        .sub(detail.meta?.preBalances?.[accountIndex] || 0)
        .toString();
  
      const tokenBalanceChangeList: Array<{ mint: string; amount: string }> = [];
  
      for (let i = 0; i < (detail.meta?.postTokenBalances?.length || 0); i++) {
        const postTokenBalance = detail.meta?.postTokenBalances?.[i];
  
        if (postTokenBalance?.owner !== address) {
          continue;
        }
  
        const mint = postTokenBalance?.mint;
  
        if (!mint) {
          console.error(
            `address: ${address} tx: ${detail.transaction.signatures[0]} mint not found`,
          );
          continue;
        }
  
        const preTokenBalance = detail.meta?.preTokenBalances?.find(
          (item) => item.mint === mint && item.owner === address,
        );
  
        if (!preTokenBalance) {
          console.error(
            `address: ${address} tx: ${detail.transaction.signatures[0]} preTokenBalance not found`,
          );
          continue;
        }
  
        const tokenBalanceChange = new Decimal(
          postTokenBalance?.uiTokenAmount?.amount || 0,
        )
          .sub(preTokenBalance?.uiTokenAmount?.amount || 0)
          .toString();
  
        tokenBalanceChangeList.push({
          mint: mint,
          amount: tokenBalanceChange.toString(),
        });
      }
  
      return {
        sol: balanceChange,
        spl: tokenBalanceChangeList,
        accountList: accountList,
      };
    }
  
    async createToken(param: {
      from: Keypair;
      name: string;
      imageUrl: string;
      symbol: string;
      decimals: number;
      initialSupply: number;
    }) {
      // Create the mint
      const mint = await createMint(
        this.connection,
        param.from,
        param.from.publicKey,
        null,
        param.decimals,
      );
  
      // Create associated token account for the mint owner
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        param.from,
        mint,
        param.from.publicKey,
      );
  
      // Mint tokens to the owner's account
      await mintTo(
        this.connection,
        param.from,
        mint,
        tokenAccount.address,
        param.from.publicKey,
        BigInt(
          new Decimal(param.initialSupply).mul(10 ** param.decimals).toString(),
        ),
        [],
      );
  
      // Create Umi instance
      const umi = createUmi(this.connection.rpcEndpoint)
        .use(mplTokenMetadata())
        .use(mplToolbox())
        .use(irysUploader());
  
      // Create signer from keypair
      const signer = createSignerFromKeypair(umi, {
        publicKey: publicKey(param.from.publicKey.toBase58()),
        secretKey: param.from.secretKey,
      });
  
      // Set the signer as the identity
      umi.use(signerIdentity(signer));
  
      const umiImageFile = await fetch(param.imageUrl).then((res) =>
        res.arrayBuffer(),
      );
  
      const imageUri = await umi.uploader
        .upload([
          {
            buffer: Buffer.from(umiImageFile),
            fileName: "image.png",
            displayName: "image.png",
            uniqueName: "image.png",
            contentType: "image/png",
            extension: "png",
            tags: [
              {
                name: "image",
                value: "image.png",
              },
            ],
          },
        ])
        .catch((err) => {
          throw new Error(err);
        });
  
      // Create metadata
      const metadata = {
        name: param.name,
        symbol: param.symbol,
        description: `Token created by ${param.from.publicKey.toBase58()}`,
        image: imageUri[0],
        attributes: [],
      };
  
      const metadataUri = await umi.uploader.uploadJson(metadata).catch((err) => {
        throw new Error(err);
      });
  
      // Create metadata URI (you might want to upload this to IPFS or similar)
  
      const metadataAccountAddress = await findMetadataPda(umi, {
        mint: publicKey(mint.toBase58()),
      });
  
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(true);
        }, 20000);
      });
  
      // Create token metadata
      const builder = await createV1(umi, {
        mint: publicKey(mint.toBase58()),
        authority: signer,
        payer: signer,
        updateAuthority: signer,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: percentAmount(0), // 0% royalty
        tokenStandard: TokenStandard.Fungible,
      });
  
      // Build and send transaction
      try {
        const { signature } = await builder.sendAndConfirm(umi);
  
        return {
          mint: mint.toBase58(),
          metadata: metadata,
          signature,
        };
      } catch (e) {
        throw e;
      }
    }
  
    async sendTransaction(param: {
      versionedTransactionHex: string;
    }) {
      const signature = await this.connection.sendRawTransaction(
        Buffer.from(param.versionedTransactionHex, "hex"),
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        },
      );
  
      return signature;
    }
  }
  
  export async function buildConnectMessage(param: {
    account: string;
    domain: string;
    statement: string;
  }) {
    const domain = param.domain;
    const address = param.account;
    const statement = param.statement;
    const nonce = Math.random().toString(36).substring(2);
    const issuedAt = new Date().toISOString();
    const expirationTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  
    const message = `${domain} wants you to sign in with your Solana account:
  ${address}
  
  ${statement}
  
  URI: ${domain}
  Version: 1
  Chain ID: solana:mainnet
  Nonce: ${nonce}
  Issued At: ${issuedAt}
  Expiration Time: ${expirationTime}`;
  
    return message;
  }
  
  export async function verifySignature(param: {
    signature: string;
    message: string;
    address: string;
  }) {
    const messageBytes = new TextEncoder().encode(param.message);
    const signatureBytes = new Uint8Array(Buffer.from(param.signature, "hex"));
    const publicKey = new PublicKey(param.address);
  
    const isValid = tweetnacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes(),
    );
    return isValid;
  }
  
  export function signMessage(secretKey: Uint8Array, message: string) {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = tweetnacl.sign.detached(messageBytes, secretKey);
    return signatureBytes;
  }
  