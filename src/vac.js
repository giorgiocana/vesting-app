import algosdk from "algosdk";
import { getAlgodClient } from "./client.js";
import wallets from "./wallets.js";

const viaAlgoSigner = async (
    senderAddr, 
    appId, 
    tokenId, 
    tokenAmount, 
    network,
) => {
    const algodClient = getAlgodClient(network);
    const txns = await tokensWithdrawTxn(
        senderAddr, 
        appId, 
        tokenId, 
        tokenAmount, 
        network,
    );
    // let txgroup = algosdk.assignGroupID(txns);
    // console.log(txgroup)

    return await wallets.sendAlgoSignerTransaction(txns, algodClient);
};

const viaWalletConnect = async (
    connector,
    senderAddr, 
    appId, 
    tokenId, 
    tokenAmount, 
    network,
) => {
    const algodClient = getAlgodClient(network);
    const txns = await tokensWithdrawTxn(
        senderAddr, 
        appId, 
        tokenId, 
        tokenAmount, 
        network,
    );
    // let txgroup = algosdk.assignGroupID(txns);
    // console.log(txgroup)

    return await wallets.sendWalletConnectTransaction(connector, txns, algodClient);
};

const viaMyAlgo = async (
    senderAddr, 
    appId, 
    tokenId, 
    tokenAmount, 
    network,
) => {
    const algodClient = getAlgodClient(network);
    const txns = await tokensWithdrawTxn(
        senderAddr, 
        appId, 
        tokenId, 
        tokenAmount, 
        network,
    );
    // let txgroup = algosdk.assignGroupID(txns);
    // console.log(txgroup)

    return await wallets.sendMyAlgoTransaction(txns, algodClient);
};


const assetOptIn = async (receiverAddr, assetId, appId, network, wallet, connector) => {
    console.log(wallet);

    if (!(receiverAddr && assetId)) {
        console.error("error", receiverAddr, assetId);
        return;
    }
    const algodClient = getAlgodClient(network);

    // create suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    let transferTxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
        receiverAddr,
        receiverAddr,
        undefined,
        undefined,
        0,
        undefined,
        assetId,
        suggestedParams
    );

    let appArgs = []; //cliff and vesting period
    let appCallTxn = algosdk.makeApplicationOptInTxn(
        receiverAddr,
        suggestedParams,
        appId,
        appArgs,
    )
    console.log(algodClient)
    console.log(wallet)
    switch (wallet) {
        case "algosigner":
            return await wallets.sendAlgoSignerTransaction([transferTxn, appCallTxn], algodClient);
        case "walletconnect":
            return await wallets.sendWalletConnectTransaction(connector, [transferTxn, appCallTxn], algodClient);
        case "myalgo":
            return await wallets.sendMyAlgoTransaction([transferTxn, appCallTxn], algodClient);
        default:
            break;
    //return await wallets.sendAlgoSignerTransaction([txn], algodClient);
    }
};


const tokensWithdrawTxn = async (senderAddr, appId, tokenId, tokenAmount, network) => {

    // convert to integer
    const amountParsed = parseInt(tokenAmount);
    //const payAmount = amountParsed * currentPrice

    if (
        !(tokenId && amountParsed && senderAddr) ||
        amountParsed <= 0
    ) {
        console.error("error", tokenId, tokenAmount, senderAddr);
        return;
    }

    const algodClient = getAlgodClient(network); 

    // create suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // let paymentTxn = algosdk.makePaymentTxnWithSuggestedParams(
    //     buyerAddr,  //sender
    //     holdingsAddr,   //receiver
    //     payAmount,
    //     undefined,
    //     undefined,
    //     suggestedParams
    // );

    //const creator = algosdk.mnemonicToSecretKey(process.env.VUE_APP_CREATOR_MNEMONIC);
    const appArgs = [
        new Uint8Array(Buffer.from("Withdraw")), 
        algosdk.encodeUint64(amountParsed)
    ];
    //const accounts = [senderAddr];
    const foreignAssets = [tokenId];

    // let sendTSLAtxn = algosdk.makeApplicationNoOpTxn(
    //     buyerAddr,   //sender
    //     suggestedParams,
    //     appId, 
    //     appArgs,
    //     accounts,
    //     undefined,
    //     foreignAssets
    // );

    let withdrawTxn = algosdk.makeApplicationNoOpTxn(
        senderAddr,   //sender
        suggestedParams,
        appId, 
        appArgs,
        [],
        undefined,
        foreignAssets
    );

    let txns = [withdrawTxn];
    // let txgroup = algosdk.assignGroupID(txns);
    // console.log(txgroup)

    return txns

    //return await wallets.sendAlgoSignerTransaction(txns, algodClient);
};

const getAccountInfo = async (address, network) => {
    const algodClient = getAlgodClient(network);
    //console.log(algodClient);

    return await algodClient.accountInformation(address).do();
};

export default {
    assetOptIn,
    viaAlgoSigner,
    viaWalletConnect,
    viaMyAlgo,    
    getAccountInfo,
};