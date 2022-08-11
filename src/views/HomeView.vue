<template>
    <div>
        <NavBar
            :sender="sender"
            :accounts="accounts"
            :network="network"
            @setNetwork="setNetwork"
            @disconnectWallet="disconnectWallet"
            @connectMyAlgo="connectMyAlgo"
            @connectToAlgoSigner="connectToAlgoSigner"
            @connectToWalletConnect="connectToWalletConnect"
            @setAccount="setAccount"
        />
        <div id="home" class="container-sm mt-5">
            <send-asset-form
                v-if="this.sender !== ''"
                :connection="this.connection"
                :network="this.network"
                :sender="this.sender"
                :walletConnector="this.connector"
            />
        </div>
    </div>
</template>

<script>
import MyAlgoConnect from "@randlabs/myalgo-connect";
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "@walletconnect/qrcode-modal";

export default {
    data() {
        return {
            connection: "", // myalgo | walletconnect | algosigner
            connector: null, // wallet connector obj
            network: "Localhost", // Localhost | TestNet
            sender: "", // connected account
            accounts: [],
        };
    },
    methods: {
        setNetwork(network) {
            this.disconnectWallet();
            this.network = network;
        },
        setAccount(account) {
            this.sender = account;
        },

        disconnectWallet() {
            this.connection = ""; 
            this.connector = null;
            this.sender = "";
            this.accounts = [];
        },

        async connectMyAlgo() {
            try {
                // force connection to TestNet
                this.network = "TestNet";

                const myAlgoWallet = new MyAlgoConnect();
                const accounts = await myAlgoWallet.connect();

                for (let i=0; i < accounts.length; i++) {
                    this.accounts.push(accounts[i].address)
                }
                this.connection = "myalgo";

            } catch (err) {
                console.error(err);
            }
        },

        async connectToAlgoSigner() {
            const AlgoSigner = window.AlgoSigner;

            if (typeof AlgoSigner !== "undefined") {
                await AlgoSigner.connect();
                const accounts = await AlgoSigner.accounts({
                    ledger: this.network,
                });

                for (let i=0; i < accounts.length; i++) {
                    this.accounts.push(accounts[i].address)
                }

                this.connection = "algosigner";
            }
        },
        
        async connectToWalletConnect() {
            // force connection to TestNet
            this.network = "TestNet";

            // Create a connector
            this.connector = new WalletConnect({
                bridge: "https://bridge.walletconnect.org", // Required
                qrcodeModal: QRCodeModal,
            });

            // Kill existing session
            if (this.connector.connected) {
                await this.connector.killSession();
            }

            this.connector.createSession();

            // Subscribe to connection events
            this.connector.on("connect", (error, payload) => {
                if (error) {
                    throw error;
                }

                const { accounts } = payload.params[0];
                this.sender = accounts[0];
                this.connection = "walletconnect";
            });

            this.connector.on("session_update", (error, payload) => {
                if (error) {
                    throw error;
                }

                const { accounts } = payload.params[0];
                this.sender = accounts[0];
                this.connection = "walletconnect";
            });

            this.connector.on("disconnect", (error, payload) => {
                if (error) {
                    throw error;
                }

                // Delete connector
                console.log(payload);
                this.sender = "";
                this.connection = "";
            });
        },
    },
};
</script>