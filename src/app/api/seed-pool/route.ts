import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import bs58 from "bs58";
import idl from "@/lib/pumpdraft.json";

export const dynamic = "force-dynamic";

const PROGRAM_ID = new PublicKey("BLz3BRDWocq7uU6jTBsMwAenSsPNN8TvewfCaRELWk5r");
const SEED_AMOUNT_SOL = 0.25;
const LAMPORTS_PER_SOL = 1_000_000_000;

class NodeWallet {
  constructor(readonly payer: Keypair) {}
  get publicKey(): PublicKey { return this.payer.publicKey; }
  async signTransaction(tx: Transaction): Promise<Transaction> {
    tx.partialSign(this.payer);
    return tx;
  }
  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    txs.forEach((tx) => tx.partialSign(this.payer));
    return txs;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { marketIdStr } = await req.json();

    if (!marketIdStr) {
      return NextResponse.json({ error: "Missing marketIdStr" }, { status: 400 });
    }

    // We need TWO wallets because the Anchor contract only allows 1 prediction per wallet per market.
    const keyUpStr = process.env.HOUSE_PRIVATE_KEY_UP;
    const keyDownStr = process.env.HOUSE_PRIVATE_KEY_DOWN;

    if (!keyUpStr || !keyDownStr) {
      console.warn("HOUSE_PRIVATE_KEY_UP or HOUSE_PRIVATE_KEY_DOWN not set. Skipping seed.");
      return NextResponse.json({ success: false, message: "House keys not configured." });
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    const amountLamports = new BN(Math.floor(SEED_AMOUNT_SOL * LAMPORTS_PER_SOL));

    // 1. Calculate Market PDA
    const encoded = new TextEncoder().encode(marketIdStr);
    const numericHash = Array.from(encoded).reduce((a, b) => a + b, 0);
    const marketIdBn = new BN(numericHash);

    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), marketIdBn.toArrayLike(Buffer, "le", 8)],
      PROGRAM_ID
    );

    // 2. Setup Wallet UP and execute
    try {
      const keypairUp = Keypair.fromSecretKey(bs58.decode(keyUpStr));
      const walletUp = new NodeWallet(keypairUp);
      const providerUp = new AnchorProvider(connection, walletUp, { preflightCommitment: "processed" });
      const programUp = new Program(idl as any, PROGRAM_ID, providerUp);

      const [predictionUpPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prediction"), marketPda.toBuffer(), keypairUp.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Check if already seeded to prevent double-seeding
      const upExists = await connection.getAccountInfo(predictionUpPda);
      if (!upExists) {
        await programUp.methods
          .makePrediction(marketIdBn, true, amountLamports)
          .accounts({
            market: marketPda,
            prediction: predictionUpPda,
            user: keypairUp.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log(`[SEED] Placed ${SEED_AMOUNT_SOL} SOL on UP`);
      }
    } catch (err: any) {
      console.error("[SEED] Error on UP wallet:", err.message);
    }

    // 3. Setup Wallet DOWN and execute
    try {
      const keypairDown = Keypair.fromSecretKey(bs58.decode(keyDownStr));
      const walletDown = new NodeWallet(keypairDown);
      const providerDown = new AnchorProvider(connection, walletDown, { preflightCommitment: "processed" });
      const programDown = new Program(idl as any, PROGRAM_ID, providerDown);

      const [predictionDownPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prediction"), marketPda.toBuffer(), keypairDown.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const downExists = await connection.getAccountInfo(predictionDownPda);
      if (!downExists) {
        await programDown.methods
          .makePrediction(marketIdBn, false, amountLamports)
          .accounts({
            market: marketPda,
            prediction: predictionDownPda,
            user: keypairDown.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log(`[SEED] Placed ${SEED_AMOUNT_SOL} SOL on DOWN`);
      }
    } catch (err: any) {
      console.error("[SEED] Error on DOWN wallet:", err.message);
    }

    return NextResponse.json({ success: true, message: "Pool seeded successfully" });

  } catch (err: any) {
    console.error("Seed pool general error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
