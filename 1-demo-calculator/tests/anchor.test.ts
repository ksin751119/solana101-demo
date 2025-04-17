import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Calculator } from "../target/types/calculator";

//Mocha works using predescribed it blocks
describe("calculator", () => {
  const provider = anchor.getProvider();


  //Referencing the program - Abstraction that allows us to call methods of our SOL program.
  const program = anchor.workspace.Calculator as Program<Calculator>;
  const programProvider = program.provider as anchor.AnchorProvider;

  //Generating a keypair for our Calculator account
  const calculatorPair = anchor.web3.Keypair.generate();

  //Generating a keypair for the Signer account
  const signerPair = provider.wallet.payer;
  const text = "School Of Solana";

  //Creating a test block
  it("Creating Calculator Instance", async () => {
    //Airdrop SOL to the Signer he will pay Rent for the Calculator Account
    // await airdrop(programProvider.connection, signerPair.publicKey);
    //Calling create instance - Set our calculator keypair as a signer
    await program.methods
      .create(text)
      .accounts({
        calculator: calculatorPair.publicKey,
        user: signerPair,
      })
      .signers([calculatorPair, signerPair])
      .rpc();

    //We fetch the account and read if the string is actually in the account
    const account = await program.account.calculator.fetch(
      calculatorPair.publicKey
    );
    assert(account.greeting === text);
  });

  //Another test step - test out addition
  it("Addition", async () => {
    await program.methods
      .add(new anchor.BN(2), new anchor.BN(3))
      .accounts({
        calculator: calculatorPair.publicKey,
      })
      .rpc();
    const account = await program.account.calculator.fetch(
      calculatorPair.publicKey
    );
    console.log("account.result", account.result.toString());
    assert(account.result.eq(new anchor.BN(5)));
  });
});

async function airdrop(connection: any, address: any, amount = 1000000000) {
  await connection.confirmTransaction(
    await connection.requestAirdrop(address, amount),
    "confirmed"
  );
}
