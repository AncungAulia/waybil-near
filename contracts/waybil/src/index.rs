//! Ordered lists stored flat: a count per key and one entry per (key, position).
//! Used for "shipments of a shipper", "drivers of a shipper" and similar views.

use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::store::LookupMap;
use near_sdk::{IntoStorageKey, near};

#[near(serializers = [borsh])]
pub struct Index<T>
where
    T: BorshSerialize + BorshDeserialize,
{
    counts: LookupMap<String, u32>,
    items: LookupMap<(String, u32), T>,
}

impl<T> Index<T>
where
    T: BorshSerialize + BorshDeserialize + Clone,
{
    pub fn new(counts_prefix: impl IntoStorageKey, items_prefix: impl IntoStorageKey) -> Self {
        Self {
            counts: LookupMap::new(counts_prefix),
            items: LookupMap::new(items_prefix),
        }
    }

    pub fn len(&self, key: &str) -> u32 {
        self.counts.get(key).copied().unwrap_or(0)
    }

    pub fn push(&mut self, key: &str, value: T) {
        let n = self.len(key);
        self.items.insert((key.to_string(), n), value);
        self.counts.insert(key.to_string(), n + 1);
    }

    /// Up to `limit` items starting at position `from`, oldest first.
    pub fn page(&self, key: &str, from: u32, limit: u32) -> Vec<T> {
        let end = self.len(key).min(from.saturating_add(limit));
        (from..end)
            .filter_map(|i| self.items.get(&(key.to_string(), i)).cloned())
            .collect()
    }
}
