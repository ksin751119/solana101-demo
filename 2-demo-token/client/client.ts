import {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    transfer,
  } from "@solana/spl-token";
  import {
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
  } from "@solana/web3.js";
  import * as anchor from "@coral-xyz/anchor";

  const provider = anchor.getProvider();

  // Client
  console.log("My address:", provider.publicKey.toString());
  const balance = await provider.connection.getBalance(provider.publicKey);
  console.log(`My balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  // 创建一个新的代币铸造厂
  const mintAuthority = Keypair.generate();

  // 使用 payer 作为支付者，创建代币铸造厂
  const mint = await createMint(
    provider.connection,
    provider.wallet.payer, // 在 solpg 中使用 provider.wallet 作为支付者
    mintAuthority.publicKey, // 铸造权限
    null, // 冻结权限
    9 // 小数位数
  );
  console.log("2");
  console.log("mint", mint);
  console.log("创建铸造厂交易签名:", mint.toString());
  console.log(`代币铸造厂地址: ${mint.toBase58()}`);

  // 为用户创建代币账户
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer, // 在 solpg 中使用 provider.wallet 作为支付者
    mint,
    provider.publicKey // 使用 provider.publicKey 作为代币账户拥有者
  );

  console.log(`代币账户地址: ${tokenAccount.address.toBase58()}`);

  // 铸造代币
  await mintTo(
    provider.connection,
    provider.wallet.payer, // 在 solpg 中使用 provider.wallet 作为支付者
    mint,
    tokenAccount.address,
    mintAuthority, // 需要使用 mintAuthority 的密钥对进行签名
    1000000000000 // 铸造 1000 个代币（考虑小数位数）
  );

  console.log("代币铸造成功！");

  // ===== 轉帳代幣功能 =====
  // 創建一個接收者賬戶（在實際應用中，這應該是真實的接收者地址）
  const recipient = Keypair.generate();
  console.log(`接收者地址: ${recipient.publicKey.toString()}`);

  // 為接收者創建代幣賬戶
  const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint,
    recipient.publicKey
  );

  console.log(`接收者代幣賬戶地址: ${recipientTokenAccount.address.toBase58()}`);

  // 轉帳代幣（從發送者到接收者）
  const transferAmount = 100000000; // 轉帳 100 個代幣（考慮小數位數）

  await transfer(
    provider.connection,
    provider.wallet.payer,
    tokenAccount.address, // 發送者代幣賬戶
    recipientTokenAccount.address, // 接收者代幣賬戶
    provider.publicKey, // 代幣擁有者（發送者）
    transferAmount // 轉帳數量
  );

  console.log(`成功轉帳 ${transferAmount / 1000000000} 個代幣到接收者賬戶！`);
