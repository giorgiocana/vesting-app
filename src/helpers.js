import algosdk from 'algosdk';

const getExplorerURL = (txId, network) => {
    switch (network) {
        case "TestNet":
            return "https://testnet.algoexplorer.io/tx/" + txId;
        default:
            return "http://localhost:8980/v2/transactions/" + txId + "?pretty";
    }
}

// read local state of application from user account
async function readLocalState(client, account, index){
    let dict = {};
    let key;
    let value;
    let accountInfoResponse = await client.accountInformation(account.address).do();
    for (let i = 0; i < accountInfoResponse['apps-local-state'].length; i++) { 
        if (accountInfoResponse['apps-local-state'][i].id == index) {
            //console.log("User's local state:");
            for (let n = 0; n < accountInfoResponse['apps-local-state'][i][`key-value`].length; n++) {
                //array.push(accountInfoResponse['apps-local-state'][i][`key-value`][n]);
                
                const gs = accountInfoResponse['apps-local-state'][i][`key-value`][n];
                key = Buffer.from(gs.key, "base64").toString();
                value = gs.value.uint;
                dict[key] = value;
            }
        }
    }
    return dict
}


async function readGlobalState(client, creatorAccount, index){
    let dict = {};
    let key;
    let value;
    let accountInfoResponse = await client.accountInformation(creatorAccount.address).do();
    console.log("accInfo: ", accountInfoResponse)
    for (let i = 0; i < accountInfoResponse['created-apps'].length; i++) { 
        if (accountInfoResponse['created-apps'][i].id == index) {
            //console.log("Application's global state:");
            for (let n = 0; n < accountInfoResponse['created-apps'][i]['params']['global-state'].length; n++) {
                const gs = accountInfoResponse['created-apps'][i]['params']['global-state'][n];
                let byteArr = Buffer.from(gs.key, "base64");  
                key = algosdk.encodeAddress(byteArr);
                
                //key = algosdk.decodeAddress(gs.key);
                value = gs.value.uint
                dict[key] = value;
            }
        }
    }
    return dict
}

export {
    getExplorerURL,
    readGlobalState,
    readLocalState
};