import { Command } from "commander";
const figlet = require("figlet");
const fs = require("fs");
import { Keypair, PublicKey } from "@solana/web3.js";
import { convertKeyPairFromArrayType } from "./0-1-convert-keypair-from-array-type";
import { requestAirdrop } from "./1-1-request-airdrop";
import { transferNativeToken } from "./1-2-transfer-native-token";
import { createRandomToken } from "./2-1-create-random-token";
import { createSpecificToken } from "./2-2-create-specific-token";
import { mintToken } from "./3-mint-token";
import { transferTokenToATA } from "./4-1-transfer-token-to-ATA";
import { transferTokenToNonATA } from "./4-2-transfer-token-to-non-ATA";
import { distributeTokenInBatch } from "./7-distribute-token-in-batch";
import { convertKeyPairFromBs58Type } from "./0-2-convert-keypair-from-bs58-type";
import { countTxRelateToPropeasy } from "./14-count-tx-relate-to-propeasy";
import { countTokenHolders } from "./9-3-count-token-holders";
import { trackEscrowVaultBalance } from "./15-track-escrow-vault-balance";

const __path = process.cwd();
const program = new Command();

const MAINNET_RPC = "https://api-mainnet-beta.renec.foundation:8899/";
const TESTNET_RPC = "https://api-testnet.renec.foundation:8899/";
const LOCAL_RPC = "http://localhost:8899/";

console.log(figlet.textSync("Script to interact Blockchain"));
console.log("");

const payerSecretKey = JSON.parse(
  fs.readFileSync(__path + "/.wallets/payer.json").toString()
);

const payer = Keypair.fromSecretKey(Uint8Array.from(payerSecretKey));

const getRpc = (network: string): string => {
  if (
    !network ||
    (network !== "mainnet" && network !== "testnet" && network !== "localnet")
  ) {
    console.log(
      "Error: -n, --network is required. [mainnet, testnet, localnet]"
    );
    process.exit(1);
  }

  let rpc = MAINNET_RPC;
  if (network === "testnet") {
    rpc = TESTNET_RPC;
  }
  if (network === "localnet") {
    rpc = LOCAL_RPC;
  }
  return rpc;
};

// yarn cli 0-1-convert-keypair-from-array-type --keyPathFile {}
program
  .command("0-1-convert-keypair-from-array-type")
  .description("0-1-convert-keypair-from-array-type")
  .option(
    "--keyPathFile <string>",
    "Relative path to keypair file",
    "/.wallets/payer.json"
  )
  .action(async (params) => {
    let { keyPathFile } = params;
    const secretKeyDirPath = JSON.parse(
      fs.readFileSync(__path + keyPathFile).toString()
    );
    const secretKey = Keypair.fromSecretKey(Uint8Array.from(secretKeyDirPath));

    convertKeyPairFromArrayType(secretKey);
  });

// yarn cli 0-2-convert-keypair-from-bs58-type -kp {}
program
  .command("0-2-convert-keypair-from-bs58-type")
  .description("0-2-convert-keypair-from-bs58-type")
  .option("-kp, --keypair <string>", "Keypair in base58 type")
  .action(async (params) => {
    let { keypair } = params;
    convertKeyPairFromBs58Type(keypair);
  });

// yarn cli 1-1-request-airdrop -n testnet -r {} -a 10
program
  .command("1-1-request-airdrop")
  .description("1-1-request-airdrop")
  .option("-n, --network <string>", "Network: testnet, localnet", "testnet")
  .option("-r, --receiver <string>", "Receiver address")
  .option("-a, --uiAmount <number>", "UI Amount", "10")
  .action(async (params) => {
    let { network, receiver, uiAmount } = params;

    const rpc = getRpc(network);
    await requestAirdrop(new PublicKey(receiver), uiAmount, rpc);
  });

// yarn cli 1-2-transfer-native-token -n testnet -r {} -a 1
program
  .command("1-2-transfer-native-token")
  .description("1-2-transfer-native-token")
  .option("-n, --network <string>", "Network: testnet, localnet", "testnet")
  .option("-r, --receiver <string>", "Receiver address")
  .option("-a, --uiAmount <number>", "UI Amount", "10")
  .action(async (params) => {
    let { network, receiver, uiAmount } = params;
    const rpc = getRpc(network);
    await transferNativeToken(payer, rpc, receiver, uiAmount);
  });

// yarn cli 2-1-create-random-token -n testnet -d 9
program
  .command("2-1-create-random-token")
  .description("2-1-create-random-token")
  .option(
    "-n, --network <string>",
    "Network: mainnet, testnet, localnet",
    "testnet"
  )
  .option("-d, --decimals <number>", "Token decimals", "9")
  .action(async (params) => {
    let { network, decimals } = params;

    const rpc = getRpc(network);
    await createRandomToken(payer, rpc, decimals);
  });

// yarn cli 2-2-create-specific-token -n testnet -d 9 --tokenKeypairPath /.wallets/token.json
program
  .command("2-2-create-specific-token")
  .description("2-2-create-specific-token")
  .option(
    "-n, --network <string>",
    "Network: mainnet, testnet, localnet",
    "testnet"
  )
  .option("-d, --decimals <number>", "Token decimals", "9")
  .option(
    "--tokenKeypairPath <string>",
    "Token keypair path",
    "/.wallets/token.json"
  )
  .action(async (params) => {
    let { network, decimals, tokenKeypairPath } = params;
    const tokenSecretKey = JSON.parse(
      fs.readFileSync(__path + tokenKeypairPath)
    );
    const tokenKeypair = Keypair.fromSecretKey(Uint8Array.from(tokenSecretKey));

    const rpc = getRpc(network);
    await createSpecificToken(payer, rpc, tokenKeypair, decimals);
  });

// yarn cli 3-mint-token -n testnet -t {} -r {} -a 10
program
  .command("3-mint-token")
  .description("3-mint-token")
  .option(
    "-n, --network <string>",
    "Network: mainnet, testnet, localnet",
    "testnet"
  )
  .option("-t, --token <string>", "Token address")
  .option("-r, --receiver <string>", "Receiver address")
  .option("-a, --uiAmount <number>", "UI Amount", "10")
  .action(async (params) => {
    let { network, token, receiver, uiAmount } = params;

    const rpc = getRpc(network);
    await mintToken(
      payer,
      rpc,
      new PublicKey(token),
      new PublicKey(receiver),
      Number(uiAmount)
    );
  });

// yarn cli 4-1-transfer-token-to-ATA -n testnet -t {} -r {} -a 10
program
  .command("4-1-transfer-token-to-ATA")
  .description("4-1-transfer-token-to-ATA")
  .option(
    "-n, --network <string>",
    "Network: mainnet, testnet, localnet",
    "testnet"
  )
  .option("-t, --token <string>", "Token address")
  .option("-r, --receiver <string>", "Receiver address")
  .option("-a, --uiAmount <number>", "UI Amount", "10")
  .action(async (params) => {
    let { network, token, receiver, uiAmount } = params;

    const rpc = getRpc(network);
    await transferTokenToATA(
      payer,
      rpc,
      new PublicKey(token),
      new PublicKey(receiver),
      Number(uiAmount)
    );
  });

// yarn cli 4-2-transfer-token-to-non-ATA -n testnet -t {} -r {} -a 10
program
  .command("4-2-transfer-token-to-non-ATA")
  .description("4-2-transfer-token-to-non-ATA")
  .option(
    "-n, --network <string>",
    "Network: mainnet, testnet, localnet",
    "testnet"
  )
  .option("-t, --token <string>", "Token address")
  .option("-r, --receiver <string>", "Receiver address")
  .option("-a, --uiAmount <number>", "UI Amount", "10")
  .action(async (params) => {
    let { network, token, receiver, uiAmount } = params;

    const rpc = getRpc(network);
    await transferTokenToNonATA(
      payer,
      rpc,
      new PublicKey(token),
      new PublicKey(receiver),
      Number(uiAmount)
    );
  });

// yarn cli 7-distribute-token-in-batch -n testnet -t {} --inputFileRelativePath {""} --resultFileRelativePath {""}
program
  .command("7-distribute-token-in-batch")
  .description("7-distribute-token-in-batch")
  .option(
    "-n, --network <string>",
    "Network: mainnet, testnet, localnet",
    "testnet"
  )
  .option("-t, --token <string>", "Token address")
  .option(
    "--inputFileRelativePath <string>",
    "Input file relative path",
    "/data/input.csv"
  )
  .option(
    "--resultFileRelativePath <string>",
    "Result file relative path",
    "/data/result.csv"
  )
  .action(async (params) => {
    let { network, token, inputFileRelativePath, resultFileRelativePath } =
      params;
    const inputFilePath = __path + inputFileRelativePath;
    const resultFilePath = __path + resultFileRelativePath;

    const rpc = getRpc(network);
    await distributeTokenInBatch(
      payer,
      rpc,
      new PublicKey(token),
      inputFilePath,
      resultFilePath
    );
  });

// yarn cli 9-3-count-token-holders -n mainnet -t {}
program
  .command("9-3-count-token-holders")
  .description("9-3-count-token-holders")
  .option(
    "-n, --network <string>",
    "Network: mainnet, testnet, localnet",
    "testnet"
  )
  .option("-t, --token <string>", "Token address")
  .action(async (params) => {
    let { network, token } = params;

    const rpc = getRpc(network);
    await countTokenHolders(rpc, new PublicKey(token));
  });

// yarn cli 14-count-tx-relate-to-propeasy -n mainnet --programId {} --resultFileRelativePath {""}
program
  .command("14-count-tx-relate-to-propeasy")
  .description("14-count-tx-relate-to-propeasy")
  .option(
    "-n, --network <string>",
    "Network: mainnet, testnet, localnet",
    "testnet"
  )
  .option("--programId <string>", "Propeasy program id")
  .option(
    "--resultFileRelativePath <string>",
    "Result file relative path",
    "/data/result.csv"
  )
  .action(async (params) => {
    let { network, programId, resultFileRelativePath } = params;
    const resultFilePath =
      resultFileRelativePath != "" ? __path + resultFileRelativePath : "";

    const rpc = getRpc(network);
    await countTxRelateToPropeasy(
      new PublicKey(programId),
      rpc,
      resultFilePath
    );
  });

// yarn cli 15-track-escrow-vault-balance -n mainnet --vault {} --resultFileRelativePath {""}
program
  .command("15-track-escrow-vault-balance")
  .description("15-track-escrow-vault-balance")
  .option(
    "-n, --network <string>",
    "Network: mainnet, testnet, localnet",
    "testnet"
  )
  .option("--vault <string>", "Vault address")
  .option(
    "--resultFileRelativePath <string>",
    "Result file relative path",
    "/data/result.csv"
  )
  .action(async (params) => {
    let { network, vault, resultFileRelativePath } = params;
    const resultFilePath =
      resultFileRelativePath != "" ? __path + resultFileRelativePath : "";

    const rpc = getRpc(network);
    await trackEscrowVaultBalance(new PublicKey(vault), rpc, resultFilePath);
  });
program.parse();
