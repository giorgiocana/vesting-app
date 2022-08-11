import sys
sys.path.insert(0,'.')

from algobpy.parse import parse_params
from pyteal import *
from math import ceil, floor

def vesting_approval():
    
    def basic_checks(txn: Txn): return And(
        Txn.close_remainder_to() == Global.zero_address(),
        Txn.rekey_to() == Global.zero_address(),
        Txn.asset_close_to() == Global.zero_address()
    )

    handle_creation = Seq(
        Assert(basic_checks(Txn)),
        App.globalPut(Bytes("AssetID"), Txn.assets[0]), 
        App.globalPut(Bytes("Team_address"), Txn.accounts[1]),  #team_acc
        App.globalPut(Bytes("Advisors_address"), Txn.accounts[2]), #advisors_acc
        App.globalPut(Bytes("Private_investor_address"), Txn.accounts[3]), #private_investors_acc
        App.globalPut(Bytes("Company_member_address"), Txn.accounts[4]), #private_investors_acc
        App.globalPut(Bytes("deployBlockCount"), Btoi(Txn.application_args[0])), 
        Return(Int(1))
    )

    handle_optin = Seq([    #account opt-in
        Assert(basic_checks(Txn)),
        Assert(App.optedIn(Txn.sender(), Txn.application_id())),
        If(Txn.sender() == App.globalGet(Bytes("Company_member_address")))
        .Then(App.localPut(Txn.sender(), Bytes("Cliff"), Int(0)))
        .Else(App.localPut(Txn.sender(), Bytes("Cliff"), Int(12))),
        App.localPut(Txn.sender(), Bytes("Spent_tokens"), Int(0)),
        Return(Int(1))
    ])

    assetOptIn = Seq([
        Assert(Txn.sender() == Global.creator_address()),
        Assert(Txn.assets[0] == App.globalGet(Bytes("AssetID"))),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.asset_amount: Int(0),
            TxnField.xfer_asset: Txn.assets[0],
        }),
        InnerTxnBuilder.Submit(),
        # App.globalPut(Bytes("Public_tokens"), Int(0)),  #25 milion in mint contract
        App.globalPut(App.globalGet(Bytes("Advisors_address")), Int(10_000_000)), #Advisors_tokens
        App.globalPut(App.globalGet(Bytes("Private_investor_address")), Int(20_000_000)), #Private_investor_tokens
        App.globalPut(App.globalGet(Bytes("Company_member_address")), Int(30_000_000)), #Company_reserves_tokens
        App.globalPut(App.globalGet(Bytes("Team_address")), Int(15_000_000)),   #Team_tokens
        Return(Int(1))
    ])

    @Subroutine(TealType.uint64)
    def do_txn(currentMonth):
        parsedAmount = Btoi(Txn.application_args[1])
        spentAmount = App.localGet(Txn.sender(), Bytes("Spent_tokens"))
        totalAmount = App.globalGet(Txn.sender()) 
        unlockedAmount = Div(Mul(totalAmount, currentMonth), Int(24))

        return Seq([            
            If(spentAmount + parsedAmount > unlockedAmount, Return(Int(0))), 
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.asset_receiver: Txn.sender(), #wallets account
                TxnField.asset_amount: parsedAmount,
                TxnField.xfer_asset: App.globalGet(Bytes("AssetID")), #Txn.assets[0],
            }),
            InnerTxnBuilder.Submit(),
            App.localPut(Txn.sender(), Bytes("Spent_tokens"), spentAmount + parsedAmount),
            Return(Int(1))
        ])    


    deployTimeout = App.globalGet(Bytes("deployBlockCount"))
    cliff = App.localGet(Txn.sender(), Bytes("Cliff"))
    withdraw = Seq([        
        If(And(
            Txn.sender() == App.globalGet(Bytes("Company_member_address")), #if address is a company member
            App.localGet(Txn.sender(), Bytes("Cliff")) == Int(0) #and has no cliff period
            )) 
        .Then(Return(do_txn(Int(24))))   # then the whole amount of its allocated tokens is unlocked 
        .ElseIf(App.globalGet(Txn.sender()) != Int(0)) #Else if the address is recognised by the logic (valid address)
        .Then(

            If(Txn.first_valid() - deployTimeout < Div(Mul(cliff, Int(30*24*60*60*10)), Int(45))) #still in the Cliff period, value corresponds to 12 months of block rounds
            .Then(Return(Int(0))) 

            .ElseIf(Txn.first_valid() - deployTimeout <= Int(floor(24*30*24*60*60/4.5))) # still in the Vesting period, value corresponds to 24 months of block rounds
            .Then(Return( do_txn( Div( Mul((Txn.first_valid() - deployTimeout), Int(45)), Int((30*24*60*60*(10))))  ))) # currentMonth calculation: difference in block rounds * 4.5 seconds / 1 month

            .Else(Return( do_txn(Int(24)) ) )
        )
        .Else(Return(Int(0))),
        Return(Int(1))
    ])

    handle_noop = Seq(
        Assert(Global.group_size() == Int(1)),
        Assert(basic_checks(Txn)),
        Cond(
            [Txn.application_args[0] == Bytes("AssetOptIn"), assetOptIn],
            [Txn.application_args[0] == Bytes("Withdraw"), withdraw],
        ))

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

    print(compileTeal(vesting_approval(), mode=Mode.Application, version=6))