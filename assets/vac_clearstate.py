from pyteal import *

def vac_clearstate():
    return Return(Int(1))

if __name__ == "__main__":
    print(compileTeal(vac_clearstate(), mode=Mode.Application, version=6))