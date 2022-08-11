import algosdk from "algosdk";
import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import MyAlgoConnect from "@randlabs/myalgo-connect";


// Contains a list of methods to send transactions via different wallet connectors

const sendAlgoSignerTransaction = async (txns, algodClient) => {
    const AlgoSigner = window.AlgoSigner;

    if (typeof AlgoSigner !== "undefined") {
        try {
            let txgroup = algosdk.assignGroupID(txns);
            console.log(txgroup);
            let binaryTxs = txns.map((txn) => {
                const txnbytes = txn.toByte();
                const base64tx = AlgoSigner.encoding.msgpackToBase64(txnbytes);
                return {
                    txn: base64tx
                }
            });

            // let base64Txs = binaryTxs.map((binary) => AlgoSigner.encoding.msgpackToBase64(binary));

            let signedTxs = await AlgoSigner.signTxn(binaryTxs);

            // Get the base64 encoded signed transaction and convert it to binary
            let binarySignedTxs = signedTxs.map((tx) => AlgoSigner.encoding.base64ToMsgpack(tx.blob));

            const response = await algodClient.sendRawTransaction(binarySignedTxs).do();

            const confirmedTxn = await algosdk.waitForConfirmation(algodClient, response.txId, 10)
            console.log(confirmedTxn);

            return response;

        } catch (err) {
            console.error(err);
        }
    }
};

const sendWalletConnectTransaction = async (connector, txns, algodClient) => {
    try {
        // Sign transaction
        // txns is an array of algosdk.Transaction like below
        // i.e txns = [txn, ...someotherTxns], but we've only built one transaction in our case
        console.log("sendWallConnect: ", connector);

        //const txns = [txn];
        //let txgroup = algosdk.assignGroupID(txns);
        //console.log(txgroup);

        const txnsToSign = txns.map(txn => {
            const encodedTxn = Buffer.from(
                algosdk.encodeUnsignedTransaction(txn)
            ).toString("base64");

            return {
                txn: encodedTxn,
                message: "Description of transaction being signed",
                // Note: if the transaction does not need to be signed (because it's part of an atomic group
                // that will be signed by another party), specify an empty singers array like so:
                // signers: [],
            };

        });

        const requestParams = [txnsToSign];   //[txnsToSign]

        const request = formatJsonRpcRequest("algo_signTxn", requestParams);
        const result = await connector.sendCustomRequest(request);
        const decodedResult = result.map(element => {
            return element
                ? new Uint8Array(Buffer.from(element, "base64"))
                : null;
        });

        const response = await algodClient
            .sendRawTransaction(decodedResult)
            .do();
        console.log(response);

        return response;
    } catch (err) {
        console.error(err);
    }
};

// const sendMyAlgoTransaction = async (txn, algodClient) => {
//     try {
//         // let txgroup = algosdk.assignGroupID(txns);
//         // console.log("txgroup: ", txgroup);

//         const myAlgoWallet = new MyAlgoConnect();

//         const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());
//         const response = await algodClient.sendRawTransaction(signedTxn.blob).do();
//         console.log(response);
        
//         return response;
//     } catch (err) {
//         console.error(err);
//     }
// };

const sendMyAlgoTransaction = async (txns, algodClient) => {
    try {
        let txgroup = algosdk.assignGroupID(txns);
        console.log(txgroup);

        const myAlgoWallet = new MyAlgoConnect();

        const signedTxs = await myAlgoWallet.signTransaction(txns.map(txn => txn.toByte()));
        const response = await algodClient.sendRawTransaction(signedTxs.map(stx => stx.blob)).do();
 
        console.log(response)
        return response

    } catch (err) {
        console.error(err);
    }
};


export default {
    sendWalletConnectTransaction,
    sendMyAlgoTransaction,
    sendAlgoSignerTransaction
};