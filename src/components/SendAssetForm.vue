<template>
    <div id="buyasset" class="mb-5">
        <h3>Withdraw vested tokens</h3>
        <p id="mybanner"> {{ this.banner }} </p>
        <div
            v-if="this.acsTxId !== ''"
            class="alert alert-success"
            role="alert"
        >
            Txn Ref:
            <a :href="explorerURL" target="_blank">{{ this.acsTxId }}</a>
        </div>
        <p> {{ this.month }}</p>
        <p>Total allocated tokens: {{ this.senderTotal }}</p>
        <p>Total unlocked tokens: {{ this.unlocked }}</p>
        <p> Unlocked tokens left to withdraw: {{ this.unlocked - this.asset_spent }}</p>
        <p> Unlocked tokens already withdrawn: {{ this.asset_spent }} </p>
        <form
            action="#"
            @submit.prevent="handleWithdraw"
        >
            <div class="mb-3">
                <label for="asset_amount" class="form-label"
                    >Specify withdraw amount: </label
                >
                <input
                    type="number"
                    class="form-control"
                    id="asset_amount"
                    v-model="asset_amount"
                />
            </div>
            <button type="submit" class="btn btn-primary">Buy</button>
        </form>
    </div>
</template>

<script>
import * as helpers from '../helpers';
import vac from "../vac.js";
import assetConfig from "../artifacts/deploy_asset.js.cp.yaml"
import algosdk from 'algosdk';
import { getAlgodClient } from "../client.js";
import WalletConnect from "@walletconnect/client";

let master;
let team_addr;
let advisors_addr;
let private_investors_addr;
let company_member_addr;
let accountsArray;

export default {
    props: {
        connection: String,
        walletConnector: WalletConnect,
        network: String,
        sender: String,
    },
    data() {
        return {
            acsTxId: "",
            asset_left: 0,
            banner: "",
            senderTotal: 0,
            asset_amount: 0,
            asset_spent: 0,
            unlocked: 0,
            month: 0,
            metadata: [], 
            explorerURL: "",
        };
    },
    async mounted() {
        if (this.network == "Localhost") {
            this.metadata = assetConfig.default.metadata;
            master = algosdk.mnemonicToSecretKey(process.env.VUE_APP_CREATOR_MNEMONIC);
            team_addr = process.env.VUE_APP_ACC1_ADDR;
            advisors_addr = process.env.VUE_APP_ACC2_ADDR;
            private_investors_addr = process.env.VUE_APP_ACC3_ADDR;
            company_member_addr = process.env.VUE_APP_ACC4_ADDR;

        } else if (this.network == "TestNet") {
            this.metadata = assetConfig.purestake.metadata; 
            master = algosdk.mnemonicToSecretKey(process.env.VUE_APP_MNEMONIC_CREATOR_TESTNET);
            team_addr = process.env.VUE_APP_ADDR_ACC1_TESTNET;
            advisors_addr = process.env.VUE_APP_ADDR_ACC2_TESTNET;
            private_investors_addr = process.env.VUE_APP_ADDR_ACC3_TESTNET;
            company_member_addr = process.env.VUE_APP_ADDR_ACC4_TESTNET;
        }
        accountsArray = [team_addr, advisors_addr, private_investors_addr, company_member_addr];

        await this.verifyAddress();
        await this.left();
    },

    methods: {
        async verifyAddress() {
            if (accountsArray.includes(this.sender)) {
                this.banner = "Your account address: " + this.sender
            } else {
                this.banner = "Invalid Account, please select a valid account to proceed"
            }
        },

        async updateTxn(value) {
            this.acsTxId = value;
            this.explorerURL = helpers.getExplorerURL(this.acsTxId, this.network);
        },

        async left() {
            if (accountsArray.includes(this.sender)) {
                console.log(this.metadata)
                const algodClient = getAlgodClient(this.network);
                let senderAccInfo = await vac.getAccountInfo(this.sender, this.network);
                let masterAccInfo = await vac.getAccountInfo(master.addr, this.network);
                this.senderTotal = (await helpers.readGlobalState(algodClient, masterAccInfo, this.metadata.vestingAppID))[this.sender];
                this.asset_spent = (await helpers.readLocalState(algodClient, senderAccInfo, this.metadata.vestingAppID))["Spent_tokens"];
                console.log("spent: ", this.asset_spent)
                this.asset_left = this.senderTotal - this.asset_spent;
                console.log("left: ", this.asset_left)


                // calculate current month and unlocked tokens
                if (this.sender == company_member_addr) {
                    this.month = "Welcome company member!";
                    this.unlocked = this.senderTotal;
                } else {
                    const vestingPeriod = 24;
                    const chainStatus = await algodClient.status().do();
                    const currentTimeoutBlockCount = chainStatus['last-round'];
                    let diff = currentTimeoutBlockCount - this.metadata.deployBlockCount
                    this.month = Math.floor(diff * (4.5/(30*24*60*60)));
                    if (this.month <= 12) {
                        this.unlocked = 0
                    } else if (this.month <= 24) {
                        this.unlocked = this.month * this.senderTotal / vestingPeriod
                    } else {
                        this.unlocked = this.senderTotal
                    }
                    this.month = "Current vesting month: " + (this.month + 1).toString()
                }
            }
        },

        async handleWithdraw() {
            const assetId = this.metadata.AssetID;

            const vestingAppAddress = algosdk.getApplicationAddress(this.metadata.vestingAppID);

            let vestingAppInfo = await vac.getAccountInfo(vestingAppAddress, this.network)

            await this.doAssetOptIn(this.sender, parseInt(assetId), this.metadata.vestingAppID);
            await this.doAssetWithdraw(
                this.sender,
                this.metadata.vestingAppID,
                assetId,
                this.asset_amount);
            
            vestingAppInfo = await vac.getAccountInfo(vestingAppAddress, this.network);
            console.log(vestingAppInfo)
        },



        async doAssetOptIn(receiver, assetId, appId) {
            // write your code here
            // clear notification
            this.acsTxId = "";

            // do asset opt in if receiver hasn't opten in to receive asset
            const receiverInfo = await vac.getAccountInfo(receiver, this.network);
            
            const optedInAsset  = receiverInfo.assets.find((asset) => {
                return asset["asset-id"] === assetId;
            });

            let optedIn = false;
            if (optedInAsset === undefined) {
                const optInResponse = await vac.assetOptIn(receiver, assetId, appId, this.network, this.connection, this.walletConnector);
                if (optInResponse.txId !== undefined) {
                    optedIn = true}
                else {console.error("Error in opt-in transaction")}}
            else {optedIn = true}
            console.log(optedIn);
            this.left();
        },

        async doAssetWithdraw(sender, appId, tokenId, tokenAmount) {
            // write your code here

            this.acsTxId = "";

            let responseTxn;

            switch (this.connection) {
                case "algosigner":
                    responseTxn = await vac.viaAlgoSigner(
                        sender,
                        appId,
                        tokenId,
                        tokenAmount,
                        this.network,
                    );
                    break;
                case "walletconnect":
                    responseTxn = await vac.viaWalletConnect(
                        this.walletConnector,
                        sender,
                        appId,
                        tokenId,
                        tokenAmount,
                        this.network,
                    );
                    break;
                case "myalgo":
                    responseTxn = await vac.viaMyAlgo(
                        sender,
                        appId,
                        tokenId,
                        tokenAmount,
                        this.network,
                    );
                    break;
                default:
                    break;
            }
            console.log(responseTxn);
            const myBanner = document.getElementById('mybanner');

            if (responseTxn !== undefined) {
                this.acsTxId = responseTxn.txId;
                this.setExplorerURL(responseTxn.txId)  //setExplorerURL
                this.asset_spent = parseInt(this.asset_spent) + parseInt(this.asset_amount)
                myBanner.style.color = 'darkgreen'
                this.banner = "The transaction was successfull!"
            }
            else {
                myBanner.style.color = 'brown'
                this.banner = "The transaction was unsuccesfull, please try again."
                
                console.error("Transfer transaction unsuccesfull.")
            }
        },

        // inserted
        setExplorerURL(txId) {
            switch (this.network) {
                case "TestNet":
                    this.explorerURL = "https://testnet.algoexplorer.io/tx/" + txId;
                    break;
                default:
                    this.explorerURL = "http://localhost:8980/v2/transactions/" + txId + "?pretty";
                    break;
            }
        },

   


    },
};
</script>

<style>
#mybanner {
    font-weight: bold;
}
</style>