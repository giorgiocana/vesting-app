import sys
sys.path.insert(0,'.')

from algobpy.parse import parse_params
from pyteal import *

def vac_approval():
    
    handle_creation = Seq([
        Assert(Txn.close_remainder_to() == Global.zero_address()),
        Assert(Txn.rekey_to() == Global.zero_address()),
        Assert(Txn.asset_close_to() == Global.zero_address()),
        Assert(App.globalGet(Bytes("AssetID")) == Int(0)), 
        App.globalPut(Bytes("AssetID"), Int(0)), 
        Return(Int(1))
    ])

    mint = Seq([
        Assert(App.globalGet(Bytes("AssetID")) == Int(0)), #checks if the asset already exists
        Assert(Txn.sender() == Global.creator_address()), 
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetConfig,
            TxnField.config_asset_name: Bytes("VACoin"),
            TxnField.config_asset_unit_name: Bytes("VAC"),
            TxnField.config_asset_url: Bytes("url"),
            TxnField.config_asset_decimals: Int(0),
            TxnField.config_asset_total: Int(100_000_000),
        }),
        InnerTxnBuilder.Submit(),
        App.globalPut(Bytes("AssetID"), InnerTxn.created_asset_id()),
        App.globalPut(Bytes("Amount"), Int(100_000_000)),
        Return(Int(1))
    ])

    vestingAddr = Seq([
        Assert(Txn.sender() == Global.creator_address()),
        App.globalPut(Bytes("Vesting_app_address"), Txn.accounts[1]),
        Return(Int(1))
    ])

    transfer = Seq([
        Assert(Txn.sender() == Global.creator_address()),
        Assert(App.globalGet(Bytes("AssetID")) != Int(0)), #checks if the asset already exists 
        Assert(App.globalGet(Bytes("Amount")) == Int(100_000_000)), 
        Assert(App.globalGet(Bytes("Vesting_app_address")) == Txn.accounts[1]),
        Assert(Txn.assets[0] == App.globalGet(Bytes("AssetID"))),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.asset_receiver: Txn.accounts[1], #vesting contract ... how to make sure it's that one?
            TxnField.asset_amount: Int(75_000_000),
            TxnField.xfer_asset: Txn.assets[0],
        }),
        InnerTxnBuilder.Submit(),
        App.globalPut(Bytes("Amount"), App.globalGet(Bytes("Amount")) - Int(75_000_000)),
        Return(Int(1))
    ])

    handle_noop = Seq(
        Assert(Global.group_size() == Int(1)), 
        Assert(Txn.sender() == Global.creator_address()),
        Assert(Txn.close_remainder_to() == Global.zero_address()),
        Assert(Txn.rekey_to() == Global.zero_address()),
        Assert(Txn.asset_close_to() == Global.zero_address()),
        Cond(
            [Txn.application_args[0] == Bytes("Mint"), mint],
            [Txn.application_args[0] == Bytes("Transfer"), transfer],
            [Txn.application_args[0] == Bytes("VestingAddr"), vestingAddr],
        )
    )

    handle_optin = Return(Int(0))
    handle_closeout = Return(Int(0))
    handle_updateapp = Return(Int(0))
    handle_deleteapp = Return(Int(0))

    program = Cond(
            [Txn.application_id() == Int(0), handle_creation],
            [Txn.on_completion() == OnComplete.OptIn, handle_optin],
            [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
            [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
            [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
            [Txn.on_completion() == OnComplete.NoOp, handle_noop]
        )
    
    return program

if __name__ == "__main__":
    params = {}

    # Overwrite params if sys.argv[1] is passed
    if(len(sys.argv) > 1):
        params = parse_params(sys.argv[1], params)

    print(compileTeal(vac_approval(), mode=Mode.Application, version=6))