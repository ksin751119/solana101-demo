use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::spl_token;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("");

#[program]
pub mod cpi_demo {
    use super::*;

    // CPI 示範 1: 鑄造代幣
    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        // 取得 PDA 資訊
        let pda_bump = ctx.bumps.authority;
        let signer_key = ctx.accounts.signer.key();

        // 建立 PDA 的簽名種子
        let seeds: &[&[u8]] = &[b"authority", signer_key.as_ref(), &[pda_bump]];
        let signer_seeds = &[seeds];

        // 建立 SPL Token 的 mint_to 指令
        let mint_to_ix = spl_token::instruction::mint_to(
            &ctx.accounts.token_program.key(), // Token 程式 ID
            &ctx.accounts.mint.key(),          // 代幣 Mint
            &ctx.accounts.token_account.key(), // 接收帳戶
            &ctx.accounts.authority.key(),     // 鑄造權限
            &[],                               // 簽署者
            amount,                            // 數量
        )?;

        // 執行 CPI
        invoke_signed(
            &mint_to_ix,
            &[
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.token_account.to_account_info(),
                ctx.accounts.authority.to_account_info(),
            ],
            signer_seeds,
        )?;

        msg!("CPI: 鑄造 {} 代幣成功", amount);
        Ok(())
    }

    // CPI 示範 2: 轉移代幣
    pub fn transfer_tokens(ctx: Context<TransferTokens>, amount: u64) -> Result<()> {
        // 取得 PDA 資訊
        let pda_bump = ctx.bumps.authority;
        let signer_key = ctx.accounts.signer.key();

        // 建立 PDA 的簽名種子
        let seeds: &[&[u8]] = &[b"authority", signer_key.as_ref(), &[pda_bump]];
        let signer_seeds = &[seeds];

        // 建立 SPL Token 的 transfer 指令
        let transfer_ix = spl_token::instruction::transfer(
            &ctx.accounts.token_program.key(), // Token 程式 ID
            &ctx.accounts.source.key(),        // 來源帳戶
            &ctx.accounts.destination.key(),   // 目標帳戶
            &ctx.accounts.authority.key(),     // 轉移權限
            &[],                               // 簽署者
            amount,                            // 數量
        )?;

        // 執行 CPI
        invoke_signed(
            &transfer_ix,
            &[
                ctx.accounts.source.to_account_info(),
                ctx.accounts.destination.to_account_info(),
                ctx.accounts.authority.to_account_info(),
            ],
            signer_seeds,
        )?;

        msg!("CPI: 轉移 {} 代幣成功", amount);
        Ok(())
    }
}

// 帳戶結構定義

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    /// 新增角色: 用於種子生成的簽署者
    #[account()]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = owner,
        mint::decimals = 6,
        mint::authority = authority,
        seeds = [b"mint", signer.key().as_ref()],
        bump
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = owner,
        token::mint = mint,
        token::authority = authority,
        seeds = [b"token_account", signer.key().as_ref()],
        bump
    )]
    pub token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"authority", signer.key().as_ref()],
        bump
    )]
    /// CHECK: PDA 作為權限帳戶
    pub authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    /// 新增角色: 用於種子生成的簽署者
    #[account()]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub source: Account<'info, TokenAccount>,

    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"authority", signer.key().as_ref()],
        bump
    )]
    /// CHECK: PDA 作為權限帳戶
    pub authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}
