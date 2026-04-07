use anchor_lang::prelude::*;

declare_id!("PumpDraft1111111111111111111111111111111111");

#[program]
pub mod pumpdraft {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        market_id: u64,
        token_mint: Pubkey,
        strike_price: u64,
        resolution_timestamp: i64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.creator = ctx.accounts.creator.key();
        market.market_id = market_id;
        market.token_mint = token_mint;
        market.strike_price = strike_price;
        market.resolution_timestamp = resolution_timestamp;
        
        market.total_up_stake = 0;
        market.total_down_stake = 0;
        market.is_resolved = false;
        market.outcome = Outcome::Pending;
        market.total_players = 0;

        Ok(())
    }

    pub fn make_prediction(
        ctx: Context<MakePrediction>,
        market_id: u64,
        is_up: bool,
        amount: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let prediction = &mut ctx.accounts.prediction;
        let clock = Clock::get()?;

        // Ensure market is still open
        require!(clock.unix_timestamp < market.resolution_timestamp, ErrorCode::MarketClosed);
        require!(!market.is_resolved, ErrorCode::MarketResolved);
        require!(amount > 0, ErrorCode::ZeroStake);

        // Transfer SOL from user to Market PDA vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: market.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, amount)?;

        // Update Market State
        if is_up {
            market.total_up_stake = market.total_up_stake.checked_add(amount).unwrap();
        } else {
            market.total_down_stake = market.total_down_stake.checked_add(amount).unwrap();
        }
        
        // Setup User's Prediction PDA
        prediction.user = ctx.accounts.user.key();
        prediction.market_id = market_id;
        prediction.is_up = is_up;
        prediction.amount = amount;
        prediction.has_claimed = false;
        
        market.total_players = market.total_players.checked_add(1).unwrap();

        Ok(())
    }

    pub fn settle_market(
        ctx: Context<SettleMarket>,
        final_price: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        // Ensure market can be resolved
        require!(clock.unix_timestamp >= market.resolution_timestamp, ErrorCode::MarketNotReady);
        require!(!market.is_resolved, ErrorCode::MarketResolved);

        // Determine outcome
        if final_price >= market.strike_price {
            market.outcome = Outcome::Up;
        } else {
            market.outcome = Outcome::Down;
        }

        market.is_resolved = true;
        market.final_price = final_price;

        Ok(())
    }

    pub fn claim_winnings(
        ctx: Context<ClaimWinnings>
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let prediction = &mut ctx.accounts.prediction;

        require!(market.is_resolved, ErrorCode::MarketNotResolved);
        require!(!prediction.has_claimed, ErrorCode::AlreadyClaimed);

        // Check if user won
        let is_winner = (market.outcome == Outcome::Up && prediction.is_up) || 
                        (market.outcome == Outcome::Down && !prediction.is_up);
        
        require!(is_winner, ErrorCode::NotAWinner);

        // Calculate payout (Pari-Mutuel Pool)
        let total_pool = market.total_up_stake.checked_add(market.total_down_stake).unwrap();
        let winning_pool = if market.outcome == Outcome::Up { market.total_up_stake } else { market.total_down_stake };
        
        // Payout = (User Stake / Winning Pool) * Total Pool
        let share = (prediction.amount as u128)
            .checked_mul(total_pool as u128)
            .unwrap()
            .checked_div(winning_pool as u128)
            .unwrap() as u64;

        // Perform PDA CPI transfer back to user
        let market_id = market.market_id.to_le_bytes();
        let bump = ctx.bumps.market;
        let seeds: &[&[&[u8]]] = &[&[b"market", market_id.as_ref(), &[bump]]];

        **market.to_account_info().try_borrow_mut_lamports()? -= share;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += share;

        prediction.has_claimed = true;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct InitializeMarket<'info> {
    #[account(
        init, 
        payer = creator, 
        space = 8 + MarketState::INIT_SPACE, 
        seeds = [b"market", market_id.to_le_bytes().as_ref()], 
        bump
    )]
    pub market: Account<'info, MarketState>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct MakePrediction<'info> {
    #[account(mut, seeds = [b"market", market_id.to_le_bytes().as_ref()], bump)]
    pub market: Account<'info, MarketState>,
    #[account(
        init, 
        payer = user, 
        space = 8 + PredictionState::INIT_SPACE,
        seeds = [b"prediction", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub prediction: Account<'info, PredictionState>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, MarketState>,
    // In production, this authority would be specifically whitelisted (e.g., Pyth oracle or Admin)
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub market: Account<'info, MarketState>,
    #[account(mut, has_one = user)]
    pub prediction: Account<'info, PredictionState>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Outcome {
    Pending,
    Up,
    Down,
}

#[account]
#[derive(InitSpace)]
pub struct MarketState {
    pub creator: Pubkey,
    pub market_id: u64,
    pub token_mint: Pubkey,
    pub strike_price: u64,
    pub final_price: u64,
    pub resolution_timestamp: i64,
    pub total_up_stake: u64,
    pub total_down_stake: u64,
    pub total_players: u64,
    pub outcome: Outcome,
    pub is_resolved: bool,
}

#[account]
#[derive(InitSpace)]
pub struct PredictionState {
    pub user: Pubkey,
    pub market_id: u64,
    pub amount: u64,
    pub is_up: bool,
    pub has_claimed: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The market has already passed its resolution deadline.")]
    MarketClosed,
    #[msg("The market has already been resolved.")]
    MarketResolved,
    #[msg("The market is not yet ready to be resolved.")]
    MarketNotReady,
    #[msg("The market is not resolved yet.")]
    MarketNotResolved,
    #[msg("You must stake greater than 0 SOL.")]
    ZeroStake,
    #[msg("Your prediction was incorrect.")]
    NotAWinner,
    #[msg("You have already claimed your winnings.")]
    AlreadyClaimed,
}
