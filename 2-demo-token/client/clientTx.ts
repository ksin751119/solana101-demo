import * as web3 from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";

async function createAndTransferToken() {
  try {
    // 獲取 provider
    const provider = anchor.getProvider();
    const connection = provider.connection;
    
    // 顯示用戶地址和餘額
    console.log("我的地址:", provider.publicKey.toString());
    const balance = await connection.getBalance(provider.publicKey);
    console.log(`我的餘額: ${balance / web3.LAMPORTS_PER_SOL} SOL`);
    
    // 創建鑄造權限密鑰對
    const mintAuthority = web3.Keypair.generate();
    console.log("鑄造權限地址:", mintAuthority.publicKey.toString());
    
    // 創建代幣鑄造帳戶
    const mintKeypair = web3.Keypair.generate();
    console.log("代幣鑄造帳戶地址:", mintKeypair.publicKey.toString());
    
    // 計算租金豁免
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    
    // 1. 創建並初始化鑄造帳戶的交易
    const decimals = 9;
    const createMintTransaction = new web3.Transaction()
      .add(
        // 創建帳戶指令
        web3.SystemProgram.createAccount({
          fromPubkey: provider.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        // 初始化鑄造帳戶指令
        createInitializeMintInstruction(
          mintKeypair.publicKey,       // 鑄造帳戶
          decimals,                    // 小數位數
          mintAuthority.publicKey,     // 鑄造權限
          null,                       // 凍結權限，設為 null
          TOKEN_PROGRAM_ID
        )
      );
    
    console.log("發送創建鑄造帳戶交易...");
    const mintTxSignature = await web3.sendAndConfirmTransaction(
      connection,
      createMintTransaction,
      [provider.wallet.payer, mintKeypair], // 簽名者
      { commitment: "confirmed" }
    );
    console.log("創建鑄造帳戶交易簽名:", mintTxSignature);
    
    // 2. 為發送者創建關聯代幣帳戶
    // 計算關聯代幣帳戶地址
    const senderTokenAccountAddress = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      provider.publicKey
    );
    console.log("發送者代幣帳戶地址:", senderTokenAccountAddress.toString());
    
    // 創建關聯代幣帳戶的交易
    const createSenderTokenAccountTx = new web3.Transaction().add(
      createAssociatedTokenAccountInstruction(
        provider.publicKey,            // 付款者
        senderTokenAccountAddress,     // 代幣帳戶地址
        provider.publicKey,            // 擁有者
        mintKeypair.publicKey,         // 鑄造帳戶
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    
    console.log("發送創建發送者代幣帳戶交易...");
    try {
      const senderTokenAccountTxSignature = await web3.sendAndConfirmTransaction(
        connection,
        createSenderTokenAccountTx,
        [provider.wallet.payer], // 簽名者
        { commitment: "confirmed" }
      );
      console.log("創建發送者代幣帳戶交易簽名:", senderTokenAccountTxSignature);
    } catch (error) {
      if (error.message.includes("already in use")) {
        console.log("發送者代幣帳戶已存在");
      } else {
        throw error;
      }
    }
    
    // 3. 鑄造代幣
    const mintAmount = 1000000000000; // 1000 個代幣 (考慮 9 位小數)
    const mintToTransaction = new web3.Transaction().add(
      createMintToInstruction(
        mintKeypair.publicKey,         // 鑄造帳戶
        senderTokenAccountAddress,     // 目標代幣帳戶
        mintAuthority.publicKey,       // 鑄造權限
        mintAmount                     // 數量
      )
    );
    
    console.log("發送鑄造代幣交易...");
    const mintToTxSignature = await web3.sendAndConfirmTransaction(
      connection,
      mintToTransaction,
      [provider.wallet.payer, mintAuthority], // 需要鑄造權限簽名
      { commitment: "confirmed" }
    );
    console.log("鑄造代幣交易簽名:", mintToTxSignature);
    console.log(`成功鑄造 ${mintAmount / Math.pow(10, decimals)} 個代幣！`);
    
    // 4. 創建接收者及其代幣帳戶
    const recipient = web3.Keypair.generate();
    console.log("接收者地址:", recipient.publicKey.toString());
    
    // 計算接收者關聯代幣帳戶地址
    const recipientTokenAccountAddress = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      recipient.publicKey
    );
    console.log("接收者代幣帳戶地址:", recipientTokenAccountAddress.toString());
    
    // 創建接收者關聯代幣帳戶的交易
    const createRecipientTokenAccountTx = new web3.Transaction().add(
      createAssociatedTokenAccountInstruction(
        provider.publicKey,             // 付款者
        recipientTokenAccountAddress,   // 代幣帳戶地址
        recipient.publicKey,            // 擁有者
        mintKeypair.publicKey,          // 鑄造帳戶
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    
    console.log("發送創建接收者代幣帳戶交易...");
    const recipientTokenAccountTxSignature = await web3.sendAndConfirmTransaction(
      connection,
      createRecipientTokenAccountTx,
      [provider.wallet.payer], // 簽名者
      { commitment: "confirmed" }
    );
    console.log("創建接收者代幣帳戶交易簽名:", recipientTokenAccountTxSignature);
    
    // 5. 轉帳代幣
    const transferAmount = 100000000; // 0.1 個代幣
    const transferTransaction = new web3.Transaction().add(
      createTransferInstruction(
        senderTokenAccountAddress,      // 來源代幣帳戶
        recipientTokenAccountAddress,   // 目標代幣帳戶
        provider.publicKey,             // 擁有者 (發送者)
        transferAmount                  // 數量
      )
    );
    
    console.log("發送代幣轉帳交易...");
    const transferTxSignature = await web3.sendAndConfirmTransaction(
      connection,
      transferTransaction,
      [provider.wallet.payer], // 簽名者
      { commitment: "confirmed" }
    );
    console.log("代幣轉帳交易簽名:", transferTxSignature);
    console.log(`成功轉帳 ${transferAmount / Math.pow(10, decimals)} 個代幣到接收者！`);
    
    // 返回所有信息
    return {
      mint: mintKeypair.publicKey.toString(),
      mintAuthority: mintAuthority.publicKey.toString(),
      senderTokenAccount: senderTokenAccountAddress.toString(),
      recipientTokenAccount: recipientTokenAccountAddress.toString(),
      recipient: recipient.publicKey.toString()
    };
  } catch (error) {
    console.error("錯誤:", error);
    throw error;
  }
}

// 執行函數
createAndTransferToken()
  .then(result => console.log("操作完成:", result))
  .catch(err => console.error("程序執行失敗:", err));