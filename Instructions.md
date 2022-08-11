# Mint Application (vac_approval.py) details
Smart contract that mints the vac tokens.

App global state variables (2 globalInts, 1 globalBytes):
- AssetID (globalInt): Vac tokens asset ID. Used for txn checks.
- Amount (globalInt): Current amount of Vac tokens held by the contract.
- Vesting_app_address (globalBytes): The Vesting smart contract address, used for txn checks.

There are 3 main functions implemented in this contract: 
- mint: this function deals with the vac tokens creation. The inner transaction configurates a fungible token (total 100_000_000 units and 0 decimals). This function saves in the global state the AssetID and the total Amount of tokens currently held by the contract.
- vestingAddr: helper function that can only be called by the contract creator which allows the contract to save the Vesting App address in the global state for future checks.
- transfer: contains an inner txn to transfer 75% of the tokens supply to the Vesting smart contract. 



# Vesting Application (vesting_approval.py) details
The vesting smart contract is the main application, and its main purpose is to allow accounts to withdraw their allocated tokens according to various checks.

**App global state variables (6 globalInts, 4 globalBytes, 2 localInts):**

| No. | Global state variable                             | Type        | 
| --- | ------------------------------------------------- | ----------- | 
| 1   | Team_address			                          | globalBytes |                
| 1   | Advisors_address	                              | globalBytes | 
| 1   | Private_investor_address                          | globalBytes |
| 1   | Company_member_address                            | globalBytes |
| 2   | deployBlockCount		                          | globalInt   | 
| 3   | Cliff           		                          | localInt    | 
| 4   | Spent_tokens           		                      | localInt    |
| 5   | App.globalGet(Bytes("Team_address"))	          | globalInt   | 
| 5   | App.globalGet(Bytes("Advisors_address"))          | globalInts  | 
| 5   | App.globalGet(Bytes("Private_investor_address"))  | globalInts  | 
| 5   | App.globalGet(Bytes("Company_member_address"))    | globalInts  | 
    
**Further details:**

1. Team_address, Advisors_address, Private_investor_address, and Company_member_address (globalBytes): store the addresses of the accounts allowed to use the application for checking purposes. The addresses are passed by the creator account during the smart contract deployment. 

2. deployBlockCount (globalInt): passed by creator account when the contract is deployed. This value is utilised to check how many the difference between the current block round and the contract deployment block round. Hence, it is useful to calculate how much time has passed since the contract deployment.

3. Cliff (localInt): stores in the account local state the duration of its cliff period.

4. Spent_tokens (localInt): stores in the account local state the amount of tokens already withdrawn by the account.

5. App.globalGet(Bytes("Advisors_address")), App.globalGet(Bytes("Private_investor_address")), App.globalGet(Bytes("Company_member_address")), and App.globalGet(Bytes("Team_address")) (globalInts): each of these global state variables stores the total amount allocated to each account, linking these values to the accounts' respective addresses.


**Main functions implemented in this contract:**
    
- handle_creation: handles the account creation, does basic checks, and saves the addresses of the valid accounts in the global state.

- handle_optin: saves a different value of cliff period in the account local state depending on which account is opting-in, also stores the account spent tokens localInt and sets it to an initial value of 0.

- assetOptIn: allows the Vesting smart contract to opt-in the Asset created by the vac application. Also stores in the global state the number of tokens allocated to each account.

- withdraw: handles the withdraw function based on the account that is trying to withdraw, the number of tokens it's trying to withdraw, and when it tries to do so. The main logic of the withdraw function is the following: 
    - If the txn sender is a company member address, it allows this account to withdraw any amount of tokens as long as it doesn't exceed its allocated amount. 
    - Otherwise, if the address is recognised by the logic, the function checks the amount of time passed from the contract deployment. If the account is still in the cliff period, the txn is rejected. If the cliff period has passed, the txn is approved as long as the withdraw amount is less then or equal to the amount of tokens unlocked by the account in that moment in time. The subroutine do_txn(current_month) calculates that amount.
    - If the account is not recognised, the txn is rejected.
    

### Deployment
- Create a .env file with your funded accounts following the template of .env.example

- (Optional) If you need to fund any of your local or testnet accounts, substitute the addresses in the fund.js file with your accounts addresses and then run the command: yarn run algob run scripts/actions/fund.js (use the flag '--network purestake' for testnet accounts)

## Local deployment commands 
- yarn run algob deploy    

## TestNet deployment commands 
- yarn run algob deploy --network purestake

## If not working, try the following commands:
- pipenv install
- pipenv shell

## Move yaml file 
Once deployment is successfull, move the yaml file in your artifacts/scripts folder in the scr/artifacts folder. Then proceed with launching the frontend app.

### Frontend
- yarn init
- source .env
- yarn serve


## Testing scripts details
**The testing scripts include tests to ensure that:**
- Both the mint and vesting contracts are deployed successfully. 
- The mint smart contract functions "mint", "transfer", and "passVestingAddr" work as expected. And show that double minting and dobule transfer fail. Transfer before passing the V
sting app address and opt-in also fails. The above mentioned functions also fail when not called by the app creator.
- The vesting app opts-in the asset and the mint app successfully, double opt-in fails. 
- Valid accounts can opt-in the asset and the vesting app successfully, and that the account local state is updated after the app opt-in.
- The Vesting app Withdraw function allows accounts who already oped-in to withdraw their unlocked amount of tokens. And that the txn fails when an account tries to withdraw a sum 
f tokens greater than its unlocked amount, or when it is still in the cliff period. 
- The withdraw transaction unlocks the correct amount of tokens for each account and calculates correctly which month in the cliff/vesting period the account is in.