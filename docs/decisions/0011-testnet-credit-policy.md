# 0011: Initial testnet credit recommendation policy

- Status: accepted for testnet on the project owner's delegated policy decision
- Date: 2026-11-10
- Supersedes the unselected-formula status in decision 0010; model trust rules remain unchanged

Use the versioned preset `be/src/config/credit-policy.testnet.json`. The recommendation is
20% of mean monthly outgoing payments across three recent consecutive statement months,
capped at 10,000 test USDC per shipper. Compute in integer base units and round down as
specified in the API. Zero spending produces zero; there is no minimum credit floor.

The coefficient is 2,000 basis points. The cap is 10,000,000,000 base units. USD statement
amounts use an explicit 1:1 accounting conversion into the test token. This is not an observed
USD/USDC market rate. Other currencies, including IDR, fail the currency check until a
separate conversion policy is reviewed. Do not silently interpret rupiah amounts as dollars.

The user confirmed the existing 2.5% shipment deduction: 97.5% driver, 1.6% pool, 0.4%
reserve and 0.5% Waybil. That pricing does not determine borrower credit limits and remains
unchanged. ShippingSpend is a self-reported form field, not independently verified capacity.

The 20% coefficient is a project-specific initial testnet choice, roughly six days of
monthly outflows using a 30-day illustration. Neither cited source prescribes it. The
10,000 ceiling matches the existing product's assistant ceiling. These parameters are not
empirically calibrated default probabilities, an industry standard or a guarantee of repayment.

The research informs process rather than the numeric coefficient. [ADB's supply chain
finance description](https://www.adb.org/what-we-do/trade-supply-chain-finance-program/supply-chain-finance)
identifies the buyer's repayment risk as central to payables finance. The [Basel Committee's
2025 principles](https://www.bis.org/publications/202504-guidelines-principles-management-credit-risk)
support defined credit-granting, monitoring and control processes. These sources do not
establish regulatory compliance for Waybil or validate its expenditure proxy.

Outgoing payments show account activity, not income, disposable cash, available liquidity or
total debt. A large outflow can reflect expenses or internal transfers. The current extractor
does not separately measure these repayment factors, and three months may miss seasonality.
For this reason keep automation disabled for this rollout. First limits require two team
approvals; existing limits are not lowered or overwritten by installing the preset.

For subsequent reviews, retain the current cooldown, full pending-proposal discovery,
three-additional-repaid-bills gate after a genuine no-change decision and live weekly cap.
Additionally block new reviews and fresh signatures when a shipper is paused or has a late
bill. Check actual Paid due dates as well as late_bills, because the hourly marker may lag.
Recheck immediately before signing. Already signed intents must still be reconciled.

Install the preset explicitly in local CREDIT_POLICY_JSON, preserving other secrets.
Keep CREDIT_AUTO_LIMITS and CREDIT_WORKER_ENABLED false until model credentials, verified
signer pins and assistant funding are configured and SAMPLE-document acceptance passes.
The existing manual `credit:once` command can exercise a configured review under supervision.
Before using real funds, replace the expenditure-only proxy with repayment-capacity evidence,
assess concentration/liquidity and currency risk, and calibrate thresholds against outcomes.

Queued reviews keep their original policy snapshot. To use this version, request a new review
after older work finishes. Changing configuration never rewrites an old recommendation.
