//! Code upgrades (docs/specs/contract.md, Upgrades; decisions 0005 and 0012).
//! `approve_upgrade` in team.rs deploys the new code and calls `migrate` in one batch.

use crate::events::emit;
use crate::team::{CODE_HASH_KEY, CODE_HASH_PENDING_KEY};
use crate::{Contract, ContractExt, STATE_VERSION};
use near_sdk::json_types::Base58CryptoHash;
use near_sdk::serde_json::json;
use near_sdk::{CryptoHash, env, near, require};

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct CodeInfo {
    /// Version of the stored state.
    pub version: u16,
    /// Base58 sha256 of the current code. Null until the first team upgrade.
    pub code_hash: Option<Base58CryptoHash>,
}

#[near]
impl Contract {
    /// Runs right after new code is deployed: by a team upgrade in the same batch, or as the
    /// init call of a deploy with the deployer key. Reads the stored state, converts it when
    /// the layout changed, and sets `version`. If it fails, the deploy rolls back.
    #[private]
    #[init(ignore_state)]
    pub fn migrate() -> Self {
        if cfg!(feature = "test-bad-migrate") {
            env::panic_str("E_TEST_BAD_MIGRATE");
        }
        let mut c: Contract = env::state_read().unwrap_or_else(|| env::panic_str("E_NO_STATE"));
        require!(c.version <= STATE_VERSION, "E_DOWNGRADE");
        c.version = STATE_VERSION;

        if let Some(new_hash) = read_hash(CODE_HASH_PENDING_KEY) {
            let old_hash = read_hash(CODE_HASH_KEY);
            env::storage_write(CODE_HASH_KEY, &new_hash);
            env::storage_remove(CODE_HASH_PENDING_KEY);
            emit(
                "contract_upgraded",
                json!({
                    "old_hash": old_hash.map(Base58CryptoHash::from),
                    "new_hash": Base58CryptoHash::from(new_hash),
                }),
            );
        }
        c
    }

    pub fn get_code_info(&self) -> CodeInfo {
        CodeInfo {
            version: self.version,
            code_hash: read_hash(CODE_HASH_KEY).map(Base58CryptoHash::from),
        }
    }
}

fn read_hash(key: &[u8]) -> Option<CryptoHash> {
    env::storage_read(key).and_then(|v| v.try_into().ok())
}
