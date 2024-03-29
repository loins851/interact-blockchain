import csvParser from "csv-parser";
import fs from "fs";
import process from "process";

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
  u64,
} from "@solana/spl-token";

import BN from "bn.js";
import * as bs58 from "bs58";
import { getTxSize } from "../utils/get-tx-size";
require("dotenv").config();

/**
 * Note:
 * Flow of script:
 * - read data from a file
 * - transfer token
 * - write data to other file
 *
 * Need update variable:
 * - rpcEndpoint
 * - payer
 * - mintTokenAccount
 * - distributor
 * - filePath
 * - resultFilePath (auto created, not need to manually create file)
 *
 * Fail when running:
 * - data will be continue appended to result file after running again
 * - need manually delete rows, which are run in file data
 */
const main = async () => {
  const rpcEndpoint =
    process.env.RPC_ENDPOINT || "https://api-testnet.renec.foundation:8899"; // https://api-mainnet-beta.renec.foundation:8899
  const connection = new Connection(rpcEndpoint, "confirmed");

  // pay for tx
  const payer = Keypair.fromSecretKey(
    bs58.decode(process.env.PRIVATE_KEY_BASE58 || "")
  );

  // reUSD or PROP
  const mintTokenAccount = new PublicKey(process.env.MINT_TOKEN_ACCOUNT || "");
  const mintTokenInfo = await connection.getParsedAccountInfo(mintTokenAccount);
  if (mintTokenInfo.value == null) return;
  const decimals = (mintTokenInfo.value.data as any).parsed.info.decimals;

  // token owner
  const distributor = payer.publicKey;

  const distributorAssociatedTokenAccount =
    await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintTokenAccount,
      distributor,
      true
    );

  const filePath = process.cwd() + "/data/propeasy/top_referrers.csv";
  const readableStream = fs.createReadStream(filePath);
  const parser = csvParser();
  readableStream.pipe(parser);

  const resultFilePath = process.cwd() + "/data/Result-top_referrers.csv";
  let isResultFileExisted = true;
  if (!fs.existsSync(resultFilePath)) {
    isResultFileExisted = false;
  }
  const writableStream = fs.createWriteStream(resultFilePath, { flags: "a+" });

  if (!isResultFileExisted) {
    writableStream.write(["wallet_address", "tx_sig"].toString() + "\n");
  }

  const fileData: {
    wallet_address: string;
  }[] = [];

  parser.on("data", async (data: { wallet_address: string }) => {
    if (!data.wallet_address) return;
    fileData.push({
      wallet_address: data.wallet_address,
    });
  });
  parser.on("end", async () => {
    const batchSize = 10;
    for (let i = 0; i < fileData.length; i += batchSize) {
      const batchData = fileData.slice(i, i + batchSize);

      const tx = new Transaction();

      for (let j = 0; j < batchData.length; j++) {
        let data = batchData[j];
        const uiAmount = new u64("10");
        const amount = uiAmount.mul(new BN(10).pow(new BN(decimals)));

        console.log("Processing with ", {
          wallet_address: data.wallet_address,
        });

        const receiver = new PublicKey(data.wallet_address);

        const receiverAssociatedTokenAccount =
          await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            mintTokenAccount,
            receiver,
            true
          );

        const associatedAccountInfo = await connection.getAccountInfo(
          receiverAssociatedTokenAccount,
          "confirmed"
        );

        if (associatedAccountInfo == null) {
          tx.add(
            Token.createAssociatedTokenAccountInstruction(
              ASSOCIATED_TOKEN_PROGRAM_ID,
              TOKEN_PROGRAM_ID,
              mintTokenAccount,
              receiverAssociatedTokenAccount,
              receiver,
              payer.publicKey
            )
          );
        }

        tx.add(
          Token.createTransferInstruction(
            TOKEN_PROGRAM_ID,
            distributorAssociatedTokenAccount,
            receiverAssociatedTokenAccount,
            payer.publicKey,
            [],
            new u64(amount.toString())
          )
        );
      }
      tx.recentBlockhash = (
        await connection.getLatestBlockhash("finalized")
      ).blockhash;
      tx.feePayer = payer.publicKey;
      console.log(getTxSize(tx, payer.publicKey));
      const txSig = await sendAndConfirmTransaction(connection, tx, [payer]);

      for (let j = 0; j < batchData.length; j++) {
        let data = batchData[j];
        writableStream.write([data.wallet_address, txSig].toString() + "\n");

        console.log("Success transfer with ", {
          wallet: data.wallet_address,
          txSig,
        });
      }
    }
  });
  parser.on("error", (error) => {
    console.error("Error reading CSV file:", error);
  });

  writableStream.on("error", (error) => {
    console.error("Error writing CSV file:", error);
  });
};

try {
  main();
} catch (error) {
  console.log(error);
}
