import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CpiDemo } from "../target/types/cpi_demo";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
const BN = anchor.BN;

describe("CPI 示範測試", () => {
  // 設定 anchor provider 和 program
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CpiDemo as Program<CpiDemo>;

  // 測試使用的帳戶
  const owner = provider.wallet.payer as anchor.Wallet;
  // const owner = anchor.web3.Keypair.generate();
  const signer = anchor.web3.Keypair.generate();
  const user = anchor.web3.Keypair.generate();

  // 預先計算的 PDA 地址
  let mintPDA: PublicKey;
  let tokenAccountPDA: PublicKey;
  let authorityPDA: PublicKey;
  let userTokenAccount: PublicKey;

  // 在測試開始前準備測試環境
  before(async () => {

    console.log("測試帳戶已充值SOL");

    // 計算 PDA 地址
    [mintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), signer.publicKey.toBuffer()],
      program.programId
    );

    [tokenAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_account"), signer.publicKey.toBuffer()],
      program.programId
    );

    [authorityPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("authority"), signer.publicKey.toBuffer()],
      program.programId
    );

    console.log("已計算出所有PDA地址");
  });

  it("執行代幣鑄造 CPI", async () => {
    console.log("1");
    const mintAmount = new BN(1000000); // 1 token (包含小數點)
    console.log("2");

    console.log("開始鑄造代幣測試...");

    try {
      // 呼叫 mint_tokens 指令
      const tx = await program.methods
        .mintTokens(mintAmount)
        .accounts({
          owner: owner.publicKey,
          signer: signer.publicKey,
          mint: mintPDA,
          tokenAccount: tokenAccountPDA,
          authority: authorityPDA,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([owner, signer])
        .rpc();

      console.log("交易成功:", tx);

      // 檢查代幣帳戶餘額
      const tokenAccountInfo = await provider.connection.getTokenAccountBalance(
        tokenAccountPDA
      );
      console.log("代幣帳戶餘額:", tokenAccountInfo.value.uiAmount);

      // 使用 assert 代替 chai 進行驗證
      assert(
        tokenAccountInfo.value.uiAmount === 1,
        `預期餘額為 1，但實際為 ${tokenAccountInfo.value.uiAmount}`
      );
      console.log("✓ 鑄造代幣測試通過");
    } catch (error) {
      console.error("鑄造代幣失敗:", error);
      throw error;
    }
  });

  it("執行代幣轉移 CPI", async () => {
    // 為 user 創建代幣帳戶

    console.log("用戶代幣帳戶不存在，創建中...");
    userTokenAccount = await getAssociatedTokenAddress(mintPDA, user.publicKey);
    const tx = new anchor.web3.Transaction().add(
      createAssociatedTokenAccountInstruction(
        owner.publicKey,
        userTokenAccount,
        user.publicKey,
        mintPDA
      )
    );
    await provider.sendAndConfirm(tx, [owner]);
    console.log("用戶代幣帳戶已創建");

    const transferAmount = new BN(500_000); // 0.5 token

    console.log("開始轉移代幣測試...");

    try {
      // 呼叫 transfer_tokens 指令
      const tx = await program.methods
        .transferTokens(transferAmount)
        .accounts({
          owner: owner.publicKey,
          signer: signer.publicKey,
          source: tokenAccountPDA,
          destination: userTokenAccount,
          authority: authorityPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([owner, signer])
        .rpc();

      console.log("交易成功:", tx);

      // 檢查來源和目標帳戶餘額
      const sourceAccountInfo =
        await provider.connection.getTokenAccountBalance(tokenAccountPDA);
      const destAccountInfo = await provider.connection.getTokenAccountBalance(
        userTokenAccount
      );

      console.log("來源帳戶餘額:", sourceAccountInfo.value.uiAmount);
      console.log("目標帳戶餘額:", destAccountInfo.value.uiAmount);

      // 使用 assert 代替 chai 進行驗證
      assert(
        sourceAccountInfo.value.uiAmount === 0.5,
        `預期來源餘額為 0.5，但實際為 ${sourceAccountInfo.value.uiAmount}`
      );
      assert(
        destAccountInfo.value.uiAmount === 0.5,
        `預期目標餘額為 0.5，但實際為 ${destAccountInfo.value.uiAmount}`
      );
      console.log("✓ 轉移代幣測試通過");
    } catch (error) {
      console.error("轉移代幣失敗:", error);
      throw error;
    }
  });
});
