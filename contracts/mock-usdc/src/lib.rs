//! Test USDC for Waybil on NEAR testnet.
//!
//! A NEP-141 token with 6 decimals, plus a faucet so anyone can try Waybil:
//! 1,000 USDC once every 24 hours per account. The owner can also mint for the
//! demo seed script. This token has no real value.

use near_contract_standards::fungible_token::events::FtMint;
use near_contract_standards::fungible_token::metadata::{
    FT_METADATA_SPEC, FungibleTokenMetadata, FungibleTokenMetadataProvider,
};
use near_contract_standards::fungible_token::{
    FungibleToken, FungibleTokenCore, FungibleTokenResolver,
};
use near_contract_standards::storage_management::{
    StorageBalance, StorageBalanceBounds, StorageManagement,
};
use near_sdk::json_types::{U64, U128};
use near_sdk::store::LookupMap;
use near_sdk::{
    AccountId, BorshStorageKey, NearToken, PanicOnDefault, PromiseOrValue, env, log, near, require,
};

/// 1 USDC in base units.
pub const ONE_USDC: u128 = 1_000_000;
/// What one faucet claim gives.
pub const FAUCET_AMOUNT: u128 = 1_000 * ONE_USDC;
/// Time between two claims from the same account.
pub const FAUCET_COOLDOWN_NS: u64 = 24 * 60 * 60 * 1_000_000_000;

#[derive(BorshStorageKey)]
#[near]
enum StorageKey {
    Token,
    FaucetClaims,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    token: FungibleToken,
    metadata: FungibleTokenMetadata,
    owner: AccountId,
    /// Last faucet claim per account, in nanoseconds.
    faucet_claims: LookupMap<AccountId, u64>,
}

#[near]
impl Contract {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        Self {
            token: FungibleToken::new(StorageKey::Token),
            metadata: FungibleTokenMetadata {
                spec: FT_METADATA_SPEC.to_string(),
                name: "Test USDC".to_string(),
                symbol: "USDC".to_string(),
                icon: None,
                reference: None,
                reference_hash: None,
                decimals: 6,
            },
            owner: owner_id,
            faucet_claims: LookupMap::new(StorageKey::FaucetClaims),
        }
    }

    /// Gives the caller 1,000 test USDC. Allowed once every 24 hours per account.
    /// Registers the caller's token storage if needed (the contract pays for it).
    pub fn faucet(&mut self) -> U128 {
        let account = env::predecessor_account_id();
        let now = env::block_timestamp();
        if let Some(last) = self.faucet_claims.get(&account) {
            require!(now >= last + FAUCET_COOLDOWN_NS, "E_FAUCET_TOO_SOON");
        }
        self.mint_to(&account, FAUCET_AMOUNT, "faucet");
        self.faucet_claims.insert(account, now);
        U128(FAUCET_AMOUNT)
    }

    /// When the account can use the faucet again, in nanoseconds. `0` means now.
    pub fn faucet_available_at(&self, account_id: AccountId) -> U64 {
        U64(self
            .faucet_claims
            .get(&account_id)
            .map(|last| last + FAUCET_COOLDOWN_NS)
            .unwrap_or(0))
    }

    /// Owner only. Mints test USDC, for example for the demo seed script.
    pub fn mint(&mut self, account_id: AccountId, amount: U128) {
        require!(env::predecessor_account_id() == self.owner, "E_NOT_OWNER");
        require!(amount.0 > 0, "E_ZERO_AMOUNT");
        self.mint_to(&account_id, amount.0, "mint");
    }

    pub fn owner(&self) -> AccountId {
        self.owner.clone()
    }

    fn mint_to(&mut self, account: &AccountId, amount: u128, memo: &str) {
        if !self.token.accounts.contains_key(account) {
            self.token.internal_register_account(account);
        }
        self.token.internal_deposit(account, amount);
        FtMint {
            owner_id: account,
            amount: U128(amount),
            memo: Some(memo),
        }
        .emit();
    }
}

#[near]
impl FungibleTokenCore for Contract {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.token.ft_transfer(receiver_id, amount, memo)
    }

    #[payable]
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        self.token.ft_transfer_call(receiver_id, amount, memo, msg)
    }

    fn ft_total_supply(&self) -> U128 {
        self.token.ft_total_supply()
    }

    fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        self.token.ft_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenResolver for Contract {
    #[private]
    fn ft_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        amount: U128,
    ) -> U128 {
        let (used, burned) =
            self.token
                .internal_ft_resolve_transfer(&sender_id, receiver_id, amount);
        if burned > 0 {
            log!("Account @{} burned {}", sender_id, burned);
        }
        used.into()
    }
}

#[near]
impl StorageManagement for Contract {
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        self.token.storage_deposit(account_id, registration_only)
    }

    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        self.token.storage_withdraw(amount)
    }

    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        self.token.internal_storage_unregister(force).is_some()
    }

    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        self.token.storage_balance_bounds()
    }

    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.token.storage_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenMetadataProvider for Contract {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        self.metadata.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{VMContextBuilder, accounts};
    use near_sdk::testing_env;

    fn ctx(caller: AccountId, now: u64) -> VMContextBuilder {
        let mut b = VMContextBuilder::new();
        b.predecessor_account_id(caller.clone())
            .signer_account_id(caller)
            .block_timestamp(now)
            .attached_deposit(NearToken::from_yoctonear(1));
        b
    }

    fn setup() -> Contract {
        testing_env!(ctx(accounts(0), 1).build());
        Contract::new(accounts(0))
    }

    #[test]
    fn metadata_is_test_usdc_with_6_decimals() {
        let c = setup();
        let m = c.ft_metadata();
        assert_eq!(m.symbol, "USDC");
        assert_eq!(m.decimals, 6);
    }

    #[test]
    fn faucet_gives_1000_and_registers_the_account() {
        let mut c = setup();
        testing_env!(ctx(accounts(1), 10).build());
        assert_eq!(c.faucet().0, FAUCET_AMOUNT);
        assert_eq!(c.ft_balance_of(accounts(1)).0, FAUCET_AMOUNT);
        assert_eq!(c.ft_total_supply().0, FAUCET_AMOUNT);
        assert_eq!(
            c.faucet_available_at(accounts(1)).0,
            10 + FAUCET_COOLDOWN_NS
        );
    }

    #[test]
    #[should_panic(expected = "E_FAUCET_TOO_SOON")]
    fn faucet_twice_within_a_day_fails() {
        let mut c = setup();
        testing_env!(ctx(accounts(1), 10).build());
        c.faucet();
        testing_env!(ctx(accounts(1), 10 + FAUCET_COOLDOWN_NS - 1).build());
        c.faucet();
    }

    #[test]
    fn faucet_works_again_after_24_hours() {
        let mut c = setup();
        testing_env!(ctx(accounts(1), 10).build());
        c.faucet();
        testing_env!(ctx(accounts(1), 10 + FAUCET_COOLDOWN_NS).build());
        c.faucet();
        assert_eq!(c.ft_balance_of(accounts(1)).0, 2 * FAUCET_AMOUNT);
    }

    #[test]
    fn available_at_is_zero_for_a_new_account() {
        let c = setup();
        assert_eq!(c.faucet_available_at(accounts(2)).0, 0);
    }

    #[test]
    fn owner_can_mint() {
        let mut c = setup();
        testing_env!(ctx(accounts(0), 10).build());
        c.mint(accounts(2), U128(25_000 * ONE_USDC));
        assert_eq!(c.ft_balance_of(accounts(2)).0, 25_000 * ONE_USDC);
    }

    #[test]
    #[should_panic(expected = "E_NOT_OWNER")]
    fn others_cannot_mint() {
        let mut c = setup();
        testing_env!(ctx(accounts(1), 10).build());
        c.mint(accounts(1), U128(ONE_USDC));
    }

    #[test]
    fn transfer_moves_tokens_between_registered_accounts() {
        let mut c = setup();
        testing_env!(ctx(accounts(1), 10).build());
        c.faucet();
        testing_env!(ctx(accounts(2), 11).build());
        c.faucet();
        testing_env!(ctx(accounts(1), 12).build());
        c.ft_transfer(accounts(2), U128(300 * ONE_USDC), None);
        assert_eq!(c.ft_balance_of(accounts(1)).0, 700 * ONE_USDC);
        assert_eq!(c.ft_balance_of(accounts(2)).0, 1_300 * ONE_USDC);
    }
}
